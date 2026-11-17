import { useEffect, useRef, type DependencyList } from 'react';
import { depsEqual } from './useDisposableMemo';
import { useUnmountEffect } from './useUnmountEffect';

/**
 * Like `useEffect` for work that owns a native resource: the returned teardown
 * runs when deps change or on a real unmount, and an `<Activity>` hide and
 * reveal keeps the run, so the resource and any values set on it survive.
 */
export function useRetainedEffect(
  effect: () => (() => void) | void,
  deps: DependencyList
): void {
  const run = useRef<{
    deps: DependencyList;
    teardown: (() => void) | void;
  } | null>(null);

  useEffect(() => {
    const previous = run.current;
    if (previous && depsEqual(previous.deps, deps)) return;
    run.current = null;
    try {
      previous?.teardown?.();
    } finally {
      run.current = { deps, teardown: effect() };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useUnmountEffect(() => {
    run.current?.teardown?.();
    run.current = null;
  });
}
