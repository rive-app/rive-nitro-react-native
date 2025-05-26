import { useCallback } from 'react';
import {
  type ViewModelEnumProperty,
  type ViewModelInstance,
} from '../specs/ViewModel.nitro';
import type { UseRivePropertyResult } from '../types';
import { useRiveProperty } from './useRiveProperty';

/**
 * Hook for interacting with enum ViewModel instance properties.
 *
 * @param path - The path to the enum property
 * @param viewModelInstance - The ViewModelInstance containing the enum property to operate on
 * @returns An object with the enum value, a setter function, and an error if the property is not found
 */
export function useRiveEnum(
  path: string,
  viewModelInstance?: ViewModelInstance | null
): UseRivePropertyResult<string> {
  const [value, setValue, error] = useRiveProperty<
    ViewModelEnumProperty,
    string
  >(viewModelInstance, path, {
    getProperty: useCallback((vmi, p) => vmi.enumProperty(p), []),
  });
  return { value, setValue, error };
}
