import { useRef, type DependencyList, type RefObject } from 'react';
import { useUnmountEffect } from './useUnmountEffect';

const UNINITIALIZED = Symbol('UNINITIALIZED');

export function depsEqual(a: DependencyList, b: DependencyList): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

/**
 * Like `useMemo`, but with a cleanup callback for disposable native resources.
 *
 * - Value is created synchronously during render (available on first render).
 * - When deps change, the old value is cleaned up during render and a new one
 *   is created.
 * - On a real unmount the value is cleaned up in the passive cleanup phase; see
 *   {@link useUnmountEffect} for what counts and the cases left to GC.
 *
 * Replaces the common `useMemo` + dispose-in-`useEffect`-cleanup pattern that
 * breaks whenever effects re-run on a live component (`<Activity>`, fast
 * refresh, Strict Mode): the cleanup disposes the native object, but `useMemo`
 * returns the same dead reference:
 *
 * ```tsx
 * // BEFORE — breaks when effects re-run
 * const property = useMemo(() => instance?.getProperty(path), [instance, path]);
 * useEffect(() => {
 *   const unsub = property?.addListener(setValue);
 *   return () => { unsub?.(); property?.dispose(); };
 * }, [property]);
 *
 * // AFTER
 * const property = useDisposableMemo(
 *   () => instance?.getProperty(path),
 *   (p) => p?.dispose(),
 *   [instance, path]
 * );
 * useEffect(() => {
 *   const unsub = property?.addListener(setValue);
 *   return () => unsub?.();  // only unsubscribe, no dispose
 * }, [property]);
 * ```
 */
export function useDisposableMemo<T>(
  factory: () => T,
  cleanup: (value: T) => void,
  deps: DependencyList,
  liveRef?: RefObject<T | undefined>
): T {
  const ref = useRef<{
    value: T;
    deps: DependencyList | typeof UNINITIALIZED;
  }>({
    value: undefined as T,
    deps: UNINITIALIZED,
  });
  const cleanupRef = useRef(cleanup);
  cleanupRef.current = cleanup;
  const liveRefRef = useRef(liveRef);
  liveRefRef.current = liveRef;

  if (
    ref.current.deps === UNINITIALIZED ||
    !depsEqual(ref.current.deps, deps)
  ) {
    if (ref.current.deps !== UNINITIALIZED) {
      if (liveRefRef.current) liveRefRef.current.current = undefined;
      try {
        cleanupRef.current(ref.current.value);
      } catch {
        // Swallow cleanup errors — the old value is being replaced regardless.
      }
    }
    ref.current = { value: factory(), deps };
    if (liveRefRef.current) liveRefRef.current.current = ref.current.value;
  }

  useUnmountEffect(() => {
    if (liveRefRef.current) liveRefRef.current.current = undefined;
    try {
      cleanupRef.current(ref.current.value);
    } catch {
      // Swallow — object may already be in a bad state.
    }
  });

  return ref.current.value;
}
