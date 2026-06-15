import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type ViewModelInstance,
  type ViewModelTriggerProperty,
} from '../specs/ViewModel.nitro';
import type {
  UseRiveTriggerResult,
  UseViewModelInstanceTriggerParameters,
} from '../types';
import { useDisposableMemo } from './useDisposableMemo';
import type {
  PathsOfKind,
  TypedViewModelInstance,
  UntypedViewModelInstance,
} from '../core/TypedViewModelInstance';
import type { RiveFileSchema } from '../core/TypedRiveFile';

/**
 * Hook for interacting with trigger ViewModel instance properties.
 *
 * Manages its own property lifecycle (separate from useRiveProperty) because
 * triggers take a user callback whose identity may change across renders.
 * Storing the callback in a ref avoids coupling it to native property disposal.
 *
 * @param path - The path to the trigger property
 * @param viewModelInstance - The ViewModelInstance containing the trigger property
 * @param params - Optional parameters including onTrigger callback
 * @returns A trigger function and any error
 */
export function useRiveTrigger<
  T extends RiveFileSchema,
  N extends Extract<keyof T['viewModels'], string>,
>(
  path: PathsOfKind<T, N, 'trigger'>,
  viewModelInstance?: TypedViewModelInstance<T, N> | null,
  params?: UseViewModelInstanceTriggerParameters
): UseRiveTriggerResult;
export function useRiveTrigger(
  path: string,
  viewModelInstance?: UntypedViewModelInstance | null,
  params?: UseViewModelInstanceTriggerParameters
): UseRiveTriggerResult;
export function useRiveTrigger(
  path: string,
  viewModelInstance?: ViewModelInstance | null,
  params?: UseViewModelInstanceTriggerParameters
): UseRiveTriggerResult {
  const { onTrigger } = params ?? {};
  const liveRef = useRef<ViewModelTriggerProperty | undefined>(undefined);
  const wasEverLive = useRef(false);

  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  const property = useDisposableMemo(
    () => {
      if (!viewModelInstance) return undefined;
      return viewModelInstance.triggerProperty(path);
    },
    (p) => p?.dispose(),
    [viewModelInstance, path],
    liveRef
  );

  if (liveRef.current) {
    wasEverLive.current = true;
  }

  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setError(null);
  }, [path, viewModelInstance]);

  useEffect(() => {
    if (viewModelInstance && !property) {
      setError(
        new Error(`Property "${path}" not found in the ViewModel instance`)
      );
    }
  }, [viewModelInstance, property, path]);

  useEffect(() => {
    if (!property) return;

    const removeListener = property.addListener(() => {
      onTriggerRef.current?.();
    });

    return () => {
      try {
        removeListener();
      } catch {
        // Property may already be disposed by useDisposableMemo (deps change).
      }
    };
  }, [property]);

  const trigger = useCallback(() => {
    if (!liveRef.current) {
      if (wasEverLive.current) {
        console.warn(
          `useRiveTrigger: trigger('${path}') called after dispose. ` +
            'The property has been cleaned up — this is likely a stale closure ' +
            'from an async callback that fired after unmount.'
        );
      } else {
        console.warn(
          `useRiveTrigger: trigger('${path}') called but the property is not available yet. ` +
            'The viewModelInstance may still be loading.'
        );
      }
      return;
    }
    liveRef.current.trigger();
  }, [path]);

  return { trigger, error };
}
