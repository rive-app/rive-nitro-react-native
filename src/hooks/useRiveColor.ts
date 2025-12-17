import { useCallback } from 'react';
import type {
  ViewModelColorProperty,
  ViewModelInstance,
} from '../specs/ViewModel.nitro';
import { useRiveProperty } from './useRiveProperty';
import { RiveColor } from '../core/RiveColor';

const COLOR_PROPERTY_OPTIONS = {
  getProperty: (vmi: ViewModelInstance, p: string) => vmi.colorProperty(p),
};

type ColorInput = RiveColor | string;
type ColorSetValueAction =
  | ColorInput
  | ((prevValue: RiveColor | undefined) => ColorInput);

export interface UseRiveColorResult {
  value: RiveColor | undefined;
  setValue: (value: ColorSetValueAction) => void;
  error: Error | null;
}

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
): UseRiveColorResult {
  const [rawValue, setRawValue, error] = useRiveProperty<
    ViewModelColorProperty,
    number
  >(viewModelInstance, path, COLOR_PROPERTY_OPTIONS);

  const value =
    rawValue !== undefined ? RiveColor.fromInt(rawValue) : undefined;

  const setValue = useCallback(
    (valueOrUpdater: ColorSetValueAction) => {
      setRawValue((prevRaw: number | undefined) => {
        const prevColor =
          prevRaw !== undefined ? RiveColor.fromInt(prevRaw) : undefined;
        const newColorInput =
          typeof valueOrUpdater === 'function'
            ? valueOrUpdater(prevColor)
            : valueOrUpdater;
        const color =
          typeof newColorInput === 'string'
            ? RiveColor.fromHexString(newColorInput)
            : newColorInput;
        return color.toInt();
      });
    },
    [setRawValue]
  );

  return { value, setValue, error };
}
