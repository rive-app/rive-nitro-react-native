import { useCallback } from 'react';
import {
  type ViewModelInstance,
  type ViewModelTriggerProperty,
} from '../specs/ViewModel.nitro';
import type {
  UseRiveTriggerResult,
  UseViewModelInstanceTriggerParameters,
} from '../types';
import { useRiveProperty } from './useRiveProperty';

/**
 * Hook for interacting with trigger ViewModel instance properties.
 *
 * @param path - The path to the trigger property
 * @param viewModelInstance - The ViewModelInstance containing the trigger property to operate on
 * @returns A trigger function that can be called to fire the trigger
 */
export function useRiveTrigger(
  path: string,
  viewModelInstance?: ViewModelInstance | null,
  params?: UseViewModelInstanceTriggerParameters
): UseRiveTriggerResult {
  const { onTrigger } = params ?? {};
  const [_, __, error, property] = useRiveProperty<
    ViewModelTriggerProperty,
    undefined
  >(viewModelInstance, path, {
    getProperty: useCallback((vmi, p) => vmi.triggerProperty(p), []),
    onPropertyEventOverride: onTrigger,
  });

  const trigger = useCallback(() => {
    if (property) {
      property.trigger();
    }
  }, [property]);

  return { trigger, error };
}
