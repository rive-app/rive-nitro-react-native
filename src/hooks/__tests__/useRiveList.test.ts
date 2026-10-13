import { renderHook, act } from '@testing-library/react-native';
import { useRiveList } from '../useRiveList';
import type { ViewModelInstance } from '../../specs/ViewModel.nitro';

// Calling a method on a disposed Nitro object crashes release builds (#407),
// so the mock records every such call.
function createMockListProperty() {
  let disposed = false;
  const callsAfterDispose: string[] = [];
  const method =
    <T>(name: string, result: T) =>
    () => {
      if (disposed) callsAfterDispose.push(name);
      return result;
    };
  return {
    callsAfterDispose,
    addListener: jest.fn(method('addListener', () => {})),
    removeListeners: jest.fn(method('removeListeners', undefined)),
    getLengthAsync: jest.fn(method('getLengthAsync', Promise.resolve(3))),
    getInstanceAtAsync: jest.fn(
      method('getInstanceAtAsync', Promise.resolve(undefined))
    ),
    addInstanceAsync: jest.fn(method('addInstanceAsync', Promise.resolve())),
    swapAsync: jest.fn(method('swapAsync', Promise.resolve())),
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

  beforeEach(() => {
    // Release builds dispose synchronously on unmount, before effect cleanups.
    previousDev = globals.__DEV__;
    globals.__DEV__ = false;
  });

  afterEach(() => {
    globals.__DEV__ = previousDev;
  });

  it('does not call into the list property after it is disposed on unmount', async () => {
    const property = createMockListProperty();
    const instance = createMockViewModelInstance(property);
    const { unmount } = renderHook(() => useRiveList('team', instance));
    await act(async () => {});
    expect(property.dispose).not.toHaveBeenCalled();
    unmount();

    expect(property.dispose).toHaveBeenCalled();
    expect(property.callsAfterDispose).toEqual([]);
  });

  it('does not call into a list property disposed by a dependency change', async () => {
    const first = createMockListProperty();
    const { rerender, unmount } = renderHook(
      ({ instance }: { instance: ViewModelInstance }) =>
        useRiveList('team', instance),
      { initialProps: { instance: createMockViewModelInstance(first) } }
    );
    await act(async () => {});
    rerender({
      instance: createMockViewModelInstance(createMockListProperty()),
    });
    await act(async () => {});

    expect(first.dispose).toHaveBeenCalled();
    expect(first.callsAfterDispose).toEqual([]);
    unmount();
  });

  it('turns operations called after unmount into no-ops', async () => {
    const property = createMockListProperty();
    const instance = createMockViewModelInstance(property);
    const { result, unmount } = renderHook(() => useRiveList('team', instance));
    await act(async () => {});
    const { getInstanceAt, addInstance, swap } = result.current;
    expect(property.dispose).not.toHaveBeenCalled();
    unmount();

    await expect(getInstanceAt(0)).resolves.toBeUndefined();
    await addInstance({} as ViewModelInstance);
    await swap(0, 1);

    expect(property.callsAfterDispose).toEqual([]);
  });

  it('changes operation identity when the list property changes', async () => {
    const { result, rerender, unmount } = renderHook(
      ({ instance }: { instance: ViewModelInstance }) =>
        useRiveList('team', instance),
      {
        initialProps: {
          instance: createMockViewModelInstance(createMockListProperty()),
        },
      }
    );
    await act(async () => {});
    const { getInstanceAt, swap } = result.current;
    rerender({
      instance: createMockViewModelInstance(createMockListProperty()),
    });
    await act(async () => {});

    expect(result.current.getInstanceAt).not.toBe(getInstanceAt);
    expect(result.current.swap).not.toBe(swap);
    unmount();
  });
});
