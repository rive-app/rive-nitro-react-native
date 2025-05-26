import { useCallback } from 'react';
import {
  type ViewModelBooleanProperty,
  type ViewModelInstance,
} from '../specs/ViewModel.nitro';
import type { UseRivePropertyResult } from '../types';
import { useRiveProperty } from './useRiveProperty';

/**
 * Hook for interacting with boolean ViewModel instance properties.
 *
 * @param path - The path to the boolean property
 * @param viewModelInstance - The ViewModelInstance containing the boolean property to operate on
 * @returns An object with the boolean value, a setter function, and an error if the property is not found
 */
export function useRiveBoolean(
  path: string,
  viewModelInstance?: ViewModelInstance | null
): UseRivePropertyResult<boolean> {
  const [value, setValue, error] = useRiveProperty<
    ViewModelBooleanProperty,
    boolean
  >(viewModelInstance, path, {
    getProperty: useCallback((vmi, p) => vmi.booleanProperty(p), []),
  });
  return { value, setValue, error };
}
