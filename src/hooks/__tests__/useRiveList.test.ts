import { renderHook, act } from '@testing-library/react-native';
import { useRiveList } from '../useRiveList';
import type { ViewModelInstance } from '../../specs/ViewModel.nitro';

// Calling a method on a disposed Nitro object dereferences a null native
// object in release builds (#407), so the mock records every such call.
function createMockListProperty() {
  let disposed = false;
  const callsAfterDispose: string[] = [];
  const track =
    <T>(name: string, impl: () => T) =>
    () => {
      if (disposed) callsAfterDispose.push(name);
      return impl();
    };
  return {
    callsAfterDispose,
    addListener: jest.fn(track('addListener', () => () => {})),
    removeListeners: jest.fn(track('removeListeners', () => {})),
    getLengthAsync: jest.fn(track('getLengthAsync', () => Promise.resolve(3))),
    getInstanceAtAsync: jest.fn(
      track('getInstanceAtAsync', () => Promise.resolve(undefined))
    ),
    addInstanceAsync: jest.fn(
      track('addInstanceAsync', () => Promise.resolve())
    ),
    addInstanceAtAsync: jest.fn(
      track('addInstanceAtAsync', () => Promise.resolve())
    ),
    removeInstanceAsync: jest.fn(
      track('removeInstanceAsync', () => Promise.resolve())
    ),
    removeInstanceAtAsync: jest.fn(
      track('removeInstanceAtAsync', () => Promise.resolve())
    ),
    swapAsync: jest.fn(track('swapAsync', () => Promise.resolve())),
    dispose: jest.fn(() => {
      disposed = true;
    }),
  };
}

type MockListProperty = ReturnType<typeof createMockListProperty>;

function createMockViewModelInstance(property: MockListProperty) {
  return {
    listProperty: jest.fn(() => property),
  } as unknown as ViewModelInstance;
}

describe('useRiveList', () => {
  const globals = globalThis as { __DEV__?: boolean };
  let previousDev: boolean | undefined;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    // Release builds dispose synchronously on unmount, before the listener
    // effect's cleanup runs.
    previousDev = globals.__DEV__;
    globals.__DEV__ = false;
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    globals.__DEV__ = previousDev;
    warn.mockRestore();
  });

  it('does not call into the list property after it is disposed on unmount', async () => {
    const property = createMockListProperty();
    const instance = createMockViewModelInstance(property);

    const { unmount } = renderHook(() => useRiveList('team', instance));
    await act(async () => {});
    unmount();

    expect(property.dispose).toHaveBeenCalled();
    expect(property.callsAfterDispose).toEqual([]);
  });

  it('does not call into a list property disposed by a dependency change', async () => {
    const first = createMockListProperty();
    const second = createMockListProperty();

    const { rerender, unmount } = renderHook(
      ({ instance }: { instance: ViewModelInstance }) =>
        useRiveList('team', instance),
      { initialProps: { instance: createMockViewModelInstance(first) } }
    );
    await act(async () => {});

    rerender({ instance: createMockViewModelInstance(second) });
    await act(async () => {});

    expect(first.dispose).toHaveBeenCalled();
    expect(first.callsAfterDispose).toEqual([]);
    unmount();
  });

  it('turns operations called after unmount into warned no-ops', async () => {
    const property = createMockListProperty();
    const instance = createMockViewModelInstance(property);
    const { result, unmount } = renderHook(() => useRiveList('team', instance));
    await act(async () => {});
    const stale = result.current;
    unmount();

    const item = {} as ViewModelInstance;
    await expect(stale.getInstanceAt(0)).resolves.toBeUndefined();
    await stale.addInstance(item);
    await stale.addInstanceAt(item, 0);
    await stale.removeInstance(item);
    await stale.removeInstanceAt(0);
    await stale.swap(0, 1);

    expect(property.callsAfterDispose).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(6);
    expect(warn.mock.calls[0]?.[0]).toContain(
      "getInstanceAt('team') called after dispose"
    );
  });

  it('routes a stale operation to the current list after a dependency change', async () => {
    const first = createMockListProperty();
    const second = createMockListProperty();
    const { result, rerender, unmount } = renderHook(
      ({ instance }: { instance: ViewModelInstance }) =>
        useRiveList('team', instance),
      { initialProps: { instance: createMockViewModelInstance(first) } }
    );
    await act(async () => {});
    const stale = result.current;

    rerender({ instance: createMockViewModelInstance(second) });
    await act(async () => {});
    await stale.getInstanceAt(0);

    expect(first.callsAfterDispose).toEqual([]);
    expect(second.getInstanceAtAsync).toHaveBeenCalledWith(0);
    unmount();
  });
});
