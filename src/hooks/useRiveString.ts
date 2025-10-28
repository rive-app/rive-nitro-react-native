import {
  type ViewModelInstance,
  type ViewModelStringProperty,
} from '../specs/ViewModel.nitro';
import type { UseRivePropertyResult } from '../types';
import { useRiveProperty } from './useRiveProperty';

const STRING_PROPERTY_OPTIONS = {
  getProperty: (vmi: ViewModelInstance, p: string) => vmi.stringProperty(p),
};

/**
 * Hook for interacting with string ViewModel instance properties.
 *
 * @param path - The path to the string property
 * @param viewModelInstance - The ViewModelInstance containing the string property to operate on
 * @returns An object with the number value, a setter function, and an error if the property is not found
 */
export function useRiveString(
  path: string,
  viewModelInstance?: ViewModelInstance | null
): UseRivePropertyResult<string> {
  const [value, setValue, error] = useRiveProperty<
    ViewModelStringProperty,
    string
  >(viewModelInstance, path, STRING_PROPERTY_OPTIONS);
  return { value, setValue, error };
}
