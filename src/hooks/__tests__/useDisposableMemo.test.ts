import { renderHook, act } from '@testing-library/react-native';
import { useDisposableMemo } from '../useDisposableMemo';

function createDisposable(label: string) {
  let alive = true;
  return {
    label,
    get value(): string {
      if (!alive) throw new Error(`${label} was disposed`);
      return `value-of-${label}`;
    },
    dispose() {
      if (!alive) throw new Error(`${label} double-disposed`);
      alive = false;
    },
    get isAlive() {
      return alive;
    },
  };
}

type Disposable = ReturnType<typeof createDisposable>;

describe('useDisposableMemo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Flush any pending deferred disposals from the test
    try {
      jest.runAllTimers();
    } catch {
      // Some tests intentionally have throwing cleanups
    }
    jest.useRealTimers();
  });

  it('creates value on first render, available immediately', () => {
    const { result } = renderHook(() =>
      useDisposableMemo(
        () => createDisposable('A'),
        (d) => d.dispose(),
        ['dep-a']
      )
    );

    expect(result.current.isAlive).toBe(true);
    expect(result.current.value).toBe('value-of-A');
  });

  it('returns same value on re-render with unchanged deps', () => {
    const factory = jest.fn(() => createDisposable('A'));

    const { result, rerender } = renderHook(() =>
      useDisposableMemo(factory, (d) => d.dispose(), ['stable'])
    );

    const firstValue = result.current;
    rerender({});
    rerender({});

    expect(result.current).toBe(firstValue);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result.current.isAlive).toBe(true);
  });

  it('disposes old value and creates new one when deps change', () => {
    const { result, rerender } = renderHook(
      (props: { dep: string }) =>
        useDisposableMemo(
          () => createDisposable(props.dep),
          (d) => d.dispose(),
          [props.dep]
        ),
      { initialProps: { dep: 'A' } }
    );

    const first = result.current;
    expect(first.label).toBe('A');
    expect(first.isAlive).toBe(true);

    rerender({ dep: 'B' });

    expect(first.isAlive).toBe(false);
    expect(result.current.label).toBe('B');
    expect(result.current.isAlive).toBe(true);
  });

  it('disposes on unmount (via deferred timeout in dev)', () => {
    const { result, unmount } = renderHook(() =>
      useDisposableMemo(
        () => createDisposable('A'),
        (d) => d.dispose(),
        ['dep']
      )
    );

    const obj = result.current;
    expect(obj.isAlive).toBe(true);

    unmount();

    // Not yet disposed — waiting for setTimeout(0)
    expect(obj.isAlive).toBe(true);

    act(() => {
      jest.runAllTimers();
    });

    expect(obj.isAlive).toBe(false);
  });

  it('handles rapid deps cycling A → B → A', () => {
    const disposed: string[] = [];

    const { result, rerender } = renderHook(
      (props: { dep: string }) =>
        useDisposableMemo(
          () => createDisposable(props.dep),
          (d) => {
            disposed.push(d.label);
            d.dispose();
          },
          [props.dep]
        ),
      { initialProps: { dep: 'A' } }
    );

    const first = result.current;

    rerender({ dep: 'B' });
    expect(disposed).toEqual(['A']);
    const second = result.current;

    rerender({ dep: 'A' });
    expect(disposed).toEqual(['A', 'B']);

    // New 'A' is a fresh instance, not the original
    expect(result.current).not.toBe(first);
    expect(result.current.label).toBe('A');
    expect(result.current.isAlive).toBe(true);
    expect(first.isAlive).toBe(false);
    expect(second.isAlive).toBe(false);
  });

  it('handles factory returning undefined', () => {
    const cleanup = jest.fn();

    const { result, rerender } = renderHook(
      (props: { dep: string }) =>
        useDisposableMemo(() => undefined as Disposable | undefined, cleanup, [
          props.dep,
        ]),
      { initialProps: { dep: 'A' } }
    );

    expect(result.current).toBeUndefined();

    rerender({ dep: 'B' });

    // cleanup called with undefined — should not throw
    expect(cleanup).toHaveBeenCalledWith(undefined);
  });

  it('survives cleanup throwing', () => {
    const { result, rerender } = renderHook(
      (props: { dep: string }) =>
        useDisposableMemo(
          () => createDisposable(props.dep),
          () => {
            throw new Error('cleanup exploded');
          },
          [props.dep]
        ),
      { initialProps: { dep: 'A' } }
    );

    expect(result.current.label).toBe('A');

    // Deps change — cleanup throws but new value is still created
    rerender({ dep: 'B' });

    expect(result.current.label).toBe('B');
    expect(result.current.isAlive).toBe(true);
  });

  it('disposes each intermediate value on sequential deps changes', () => {
    const disposed: string[] = [];

    const { result, rerender, unmount } = renderHook(
      (props: { dep: string }) =>
        useDisposableMemo(
          () => createDisposable(props.dep),
          (d) => {
            disposed.push(d.label);
            d.dispose();
          },
          [props.dep]
        ),
      { initialProps: { dep: 'A' } }
    );

    rerender({ dep: 'B' });
    rerender({ dep: 'C' });
    rerender({ dep: 'D' });

    expect(disposed).toEqual(['A', 'B', 'C']);
    expect(result.current.label).toBe('D');
    expect(result.current.isAlive).toBe(true);

    unmount();
    act(() => {
      jest.runAllTimers();
    });

    expect(disposed).toEqual(['A', 'B', 'C', 'D']);
  });

  it('compares deps with Object.is semantics', () => {
    const factory = jest.fn(() => createDisposable('A'));

    const { rerender } = renderHook(
      (props: { dep: number }) =>
        useDisposableMemo(factory, (d) => d.dispose(), [props.dep]),
      { initialProps: { dep: NaN } }
    );

    expect(factory).toHaveBeenCalledTimes(1);

    // NaN === NaN under Object.is
    rerender({ dep: NaN });
    expect(factory).toHaveBeenCalledTimes(1);

    // 0 !== -0 under Object.is
    rerender({ dep: 0 });
    expect(factory).toHaveBeenCalledTimes(2);

    rerender({ dep: -0 });
    expect(factory).toHaveBeenCalledTimes(3);
  });
});
