import { useCallback, useEffect, useState, useMemo } from 'react';
import type { ViewModelInstance } from '../specs/ViewModel.nitro';
import type { UseRiveListResult } from '../types';

/**
 * Hook for interacting with list ViewModel instance properties.
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
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    setError(null);
  }, [path, viewModelInstance]);

  const property = useMemo(() => {
    if (!viewModelInstance) return undefined;
    return viewModelInstance.listProperty(path);
  }, [viewModelInstance, path]);

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
      removeListener();
      property.removeListeners();
      property.dispose();
    };
  }, [property]);

  const length = useMemo(() => {
    // revision is used to trigger re-computation when list changes
    revision;
    return property?.length ?? 0;
  }, [property, revision]);

  const getInstanceAt = useCallback(
    (index: number) => {
      return property?.getInstanceAt(index);
    },
    [property]
  );

  const addInstance = useCallback(
    (instance: ViewModelInstance) => {
      property?.addInstance(instance);
    },
    [property]
  );

  const addInstanceAt = useCallback(
    (instance: ViewModelInstance, index: number) => {
      return property?.addInstanceAt(instance, index) ?? false;
    },
    [property]
  );

  const removeInstance = useCallback(
    (instance: ViewModelInstance) => {
      property?.removeInstance(instance);
    },
    [property]
  );

  const removeInstanceAt = useCallback(
    (index: number) => {
      property?.removeInstanceAt(index);
    },
    [property]
  );

  const swap = useCallback(
    (index1: number, index2: number) => {
      return property?.swap(index1, index2) ?? false;
    },
    [property]
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
