import { useCallback, useEffect, useState } from 'react';
import type { ViewModelInstance } from '../specs/ViewModel.nitro';
import type { UseRiveListResult } from '../types';
import { useDisposableMemo } from './useDisposableMemo';

/**
 * Hook for interacting with list ViewModel instance properties.
 *
 * All operations go through the async native API — on the experimental
 * backend the sync accessors would block the JS thread on the command queue.
 *
 * @param path - The path to the list property
 * @param viewModelInstance - The ViewModelInstance containing the list property
 * @returns An object with list length, manipulation methods, and error state
 */
export function useRiveList(
  path: string,
  viewModelInstance?: ViewModelInstance | null
): UseRiveListResult {
  const [error, setError] = useState<Error | null>(null);
  const [length, setLength] = useState(0);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    setError(null);
  }, [path, viewModelInstance]);

  const property = useDisposableMemo(
    () => {
      if (!viewModelInstance) return undefined;
      return viewModelInstance.listProperty(path);
    },
    (p) => p?.dispose(),
    [viewModelInstance, path]
  );

  useEffect(() => {
    if (viewModelInstance && !property) {
      setError(
        new Error(`List property "${path}" not found in the ViewModel instance`)
      );
    }
  }, [viewModelInstance, property, path]);

  useEffect(() => {
    if (!property) return;

    const removeListener = property.addListener(() => {
      setRevision((r) => r + 1);
    });

    return () => {
      try {
        removeListener();
        property.removeListeners();
      } catch {
        // Property may already be disposed by useDisposableMemo (deps change).
        // Native dispose() handles listener cleanup, so this is safe to ignore.
      }
    };
  }, [property]);

  // Re-read the length whenever the list changes (revision bumps) or the
  // property itself changes. On the experimental backend a rejection here is
  // also how an invalid list path surfaces.
  useEffect(() => {
    if (!property) {
      setLength(0);
      return;
    }
    let cancelled = false;
    property.getLengthAsync().then(
      (len) => {
        if (!cancelled) setLength(len);
      },
      (e: unknown) => {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(
          new Error(`List property "${path}" is not available: ${message}`)
        );
      }
    );
    return () => {
      cancelled = true;
    };
  }, [property, path, revision]);

  // The experimental backend has no native list-change notifications
  // (addListener is a no-op there) — refresh after our own mutations so
  // `length` stays live on both backends.
  const afterMutation = useCallback(<T>(op: Promise<T>): Promise<T> => {
    return op.then((result) => {
      setRevision((r) => r + 1);
      return result;
    });
  }, []);

  const getInstanceAt = useCallback(
    (index: number) => {
      return property
        ? property.getInstanceAtAsync(index)
        : Promise.resolve(undefined);
    },
    [property]
  );

  const addInstance = useCallback(
    (instance: ViewModelInstance) => {
      return property
        ? afterMutation(property.addInstanceAsync(instance))
        : Promise.resolve();
    },
    [property, afterMutation]
  );

  const addInstanceAt = useCallback(
    (instance: ViewModelInstance, index: number) => {
      return property
        ? afterMutation(property.addInstanceAtAsync(instance, index))
        : Promise.resolve();
    },
    [property, afterMutation]
  );

  const removeInstance = useCallback(
    (instance: ViewModelInstance) => {
      return property
        ? afterMutation(property.removeInstanceAsync(instance))
        : Promise.resolve();
    },
    [property, afterMutation]
  );

  const removeInstanceAt = useCallback(
    (index: number) => {
      return property
        ? afterMutation(property.removeInstanceAtAsync(index))
        : Promise.resolve();
    },
    [property, afterMutation]
  );

  const swap = useCallback(
    (index1: number, index2: number) => {
      return property
        ? afterMutation(property.swapAsync(index1, index2))
        : Promise.resolve();
    },
    [property, afterMutation]
  );

  return {
    length,
    getInstanceAt,
    addInstance,
    addInstanceAt,
    removeInstance,
    removeInstanceAt,
    swap,
    error,
  };
}
