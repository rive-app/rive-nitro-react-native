import {
  useEffect,
  useInsertionEffect,
  useRef,
  type DependencyList,
  type RefObject,
} from 'react';
import { Retainer } from './useUnmountEffect';

export function depsEqual(a: DependencyList, b: DependencyList): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

type Entry<T> = { value: T; deps: DependencyList; retainer: Retainer };

/**
 * Like `useMemo`, but with a cleanup callback for disposable native resources.
 *
 * - Value is created synchronously during render (available on first render).
 * - When deps change, a new value is created during render; the old one is
 *   cleaned up only once the render that replaces it commits.
 * - A value from a render that never commits is left to GC.
 * - On a real unmount the value is cleaned up after the passive cleanups; see
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
 *
 * `liveRef` holds the committed value and is cleared when that value is
 * cleaned up.
 */
export function useDisposableMemo<T>(
  factory: () => T,
  cleanup: (value: T) => void,
  deps: DependencyList,
  liveRef?: RefObject<T | undefined>
): T {
  const state = useRef<{ candidate?: Entry<T>; committed?: Entry<T> }>({});
  const cleanupRef = useRef(cleanup);
  cleanupRef.current = cleanup;
  const liveRefRef = useRef(liveRef);
  liveRefRef.current = liveRef;

  const reusable = (e: Entry<T> | undefined) =>
    e && !e.retainer.released && depsEqual(e.deps, deps) ? e : undefined;
  let entry = reusable(state.current.candidate);
  entry ??= reusable(state.current.committed);
  if (!entry) {
    const value = factory();
    entry = {
      value,
      deps,
      retainer: new Retainer(() => {
        const live = liveRefRef.current;
        if (live && live.current === value) live.current = undefined;
        try {
          cleanupRef.current(value);
        } catch {
          // Swallow — object may already be in a bad state.
        }
      }),
    };
  }
  state.current.candidate = entry;

  const committed = entry;
  useInsertionEffect(() => {
    state.current.committed = committed;
    if (liveRefRef.current) liveRefRef.current.current = committed.value;
    return committed.retainer.retain();
  }, [committed]);
  useEffect(() => committed.retainer.retain(), [committed]);

  return entry.value;
}
