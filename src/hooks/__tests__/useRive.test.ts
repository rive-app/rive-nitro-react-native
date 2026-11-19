import { act, renderHook } from '@testing-library/react-native';
import { useRive } from '../useRive';
import type { RiveViewRef } from '../../index';

describe('useRive', () => {
  it('exposes an undefined (pending) riveViewRef before the view is ready, not null', () => {
    // `undefined` = pending, `null` = failed — the useRiveFile convention.
    // A null here would make useViewModelInstance({async: true})(riveViewRef) settle to
    // a terminal "no ViewModel" during normal mount (and throw with
    // `required: true`) before the view has even attached.
    const { result } = renderHook(() => useRive());
    expect(result.current.riveViewRef).toBeUndefined();
  });
});

function deferredView() {
  let resolve!: (ready: boolean) => void;
  const ready = new Promise<boolean>((r) => {
    resolve = r;
  });
  const view = { awaitViewReady: () => ready } as unknown as RiveViewRef;
  return { view, resolve };
}

describe('useRive when the native view is replaced (#473)', () => {
  it('stops returning the old view as soon as a new one arrives', async () => {
    const a = deferredView();
    const b = deferredView();
    const { result } = renderHook(() => useRive());

    act(() => result.current.setHybridRef.f(a.view));
    await act(async () => a.resolve(true));
    expect(result.current.riveViewRef).toBe(a.view);

    act(() => result.current.setHybridRef.f(b.view));
    expect(result.current.riveViewRef).toBeUndefined();

    await act(async () => b.resolve(true));
    expect(result.current.riveViewRef).toBe(b.view);
  });

  it('ignores an older view that becomes ready after a newer one arrived', async () => {
    const a = deferredView();
    const b = deferredView();
    const { result } = renderHook(() => useRive());

    act(() => result.current.setHybridRef.f(a.view));
    act(() => result.current.setHybridRef.f(b.view));
    await act(async () => b.resolve(true));
    await act(async () => a.resolve(true));
    expect(result.current.riveViewRef).toBe(b.view);

    // A replaced view settles its waiters with false when it is torn down.
    const c = deferredView();
    act(() => result.current.setHybridRef.f(c.view));
    await act(async () => c.resolve(true));
    await act(async () => b.resolve(false));
    expect(result.current.riveViewRef).toBe(c.view);
  });
});
