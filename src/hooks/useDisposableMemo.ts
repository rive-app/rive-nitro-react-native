import { useRef, useEffect, type DependencyList } from 'react';

const UNINITIALIZED = Symbol('UNINITIALIZED');

function depsEqual(a: DependencyList, b: DependencyList): boolean {
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
 * - On unmount in production: cleaned up synchronously in effect cleanup.
 * - On unmount in development: cleanup is deferred via `setTimeout(0)` so that
 *   fast refresh and Strict Mode can cancel it when effects re-run.
 *
 * Replaces the common `useMemo` + dispose-in-`useEffect`-cleanup pattern that
 * breaks on fast refresh (HMR re-runs all effect cleanups, disposing the native
 * object, but `useMemo` returns the same dead reference):
 *
 * ```tsx
 * // BEFORE — breaks on fast refresh
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
  deps: DependencyList
): T {
  const ref = useRef<{
    value: T;
    deps: DependencyList | typeof UNINITIALIZED;
    pendingDisposal: ReturnType<typeof setTimeout> | null;
  }>({
    value: undefined as T,
    deps: UNINITIALIZED,
    pendingDisposal: null,
  });
  const cleanupRef = useRef(cleanup);
  cleanupRef.current = cleanup;

  if (
    ref.current.deps === UNINITIALIZED ||
    !depsEqual(ref.current.deps, deps)
  ) {
    if (__DEV__ && ref.current.pendingDisposal !== null) {
      clearTimeout(ref.current.pendingDisposal);
      ref.current.pendingDisposal = null;
    }
    if (ref.current.deps !== UNINITIALIZED) {
      try {
        cleanupRef.current(ref.current.value);
      } catch {
        // Swallow cleanup errors — the old value is being replaced regardless.
      }
    }
    ref.current = { value: factory(), deps, pendingDisposal: null };
  }

  useEffect(() => {
    if (__DEV__) {
      if (ref.current.pendingDisposal !== null) {
        clearTimeout(ref.current.pendingDisposal);
        ref.current.pendingDisposal = null;
      }
    }
    return () => {
      if (__DEV__) {
        const val = ref.current.value;
        ref.current.pendingDisposal = setTimeout(() => {
          cleanupRef.current(val);
          ref.current.pendingDisposal = null;
        }, 0);
      } else {
        cleanupRef.current(ref.current.value);
      }
    };
  }, []);

  return ref.current.value;
}
