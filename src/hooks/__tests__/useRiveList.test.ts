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
  it('does not call into a list property disposed by a dependency change', async () => {
    const first = createMockListProperty();
    const second = createMockListProperty();
    const firstInstance = createMockViewModelInstance(first);
    const secondInstance = createMockViewModelInstance(second);

    const { rerender, unmount } = renderHook(
      ({ instance }: { instance: ViewModelInstance }) =>
        useRiveList('team', instance),
      { initialProps: { instance: firstInstance } }
    );
    await act(async () => {});

    rerender({ instance: secondInstance });
    await act(async () => {});

    expect(first.dispose).toHaveBeenCalled();
    expect(first.callsAfterDispose).toEqual([]);
    unmount();
  });

  it('does not call into the list property after it is disposed on unmount', async () => {
    const globals = globalThis as { __DEV__?: boolean };
    const previousDev = globals.__DEV__;
    // Release builds dispose synchronously on unmount, before the listener
    // effect's cleanup runs.
    globals.__DEV__ = false;
    try {
      const property = createMockListProperty();
      const instance = createMockViewModelInstance(property);

      const { unmount } = renderHook(() => useRiveList('team', instance));
      await act(async () => {});
      unmount();

      expect(property.dispose).toHaveBeenCalled();
      expect(property.callsAfterDispose).toEqual([]);
    } finally {
      globals.__DEV__ = previousDev;
    }
  });
});
