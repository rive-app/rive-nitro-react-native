import { useCallback } from 'react';
import type {
  ViewModelColorProperty,
  ViewModelInstance,
} from '../specs/ViewModel.nitro';
import { type UseRivePropertyResult } from '../types';
import { useRiveProperty } from './useRiveProperty';
import { RiveColor } from '../core/RiveColor';

/**
 * Hook for interacting with color ViewModel instance properties.
 *
 * @param path - The path to the color property
 * @param viewModelInstance - The ViewModelInstance containing the color property to operate on
 * @returns An object with the color value as RGBA, a setter function that accepts either RGBA or hex string, and an error if the property is not found
 */
export function useRiveColor(
  path: string,
  viewModelInstance?: ViewModelInstance | null
): UseRivePropertyResult<RiveColor> & {
  setValue: (value: RiveColor | string) => void;
} {
  const [rawValue, setRawValue, error] = useRiveProperty<
    ViewModelColorProperty,
    number
  >(viewModelInstance, path, {
    getProperty: useCallback((vmi, p) => vmi.colorProperty(p), []),
  });

  const value =
    rawValue !== undefined ? RiveColor.fromInt(rawValue) : undefined;

  const setValue = useCallback(
    (newValue: RiveColor | string) => {
      const color =
        typeof newValue === 'string'
          ? RiveColor.fromHexString(newValue)
          : newValue;
      setRawValue(color.toInt());
    },
    [setRawValue]
  );

  return { value, setValue, error };
}
