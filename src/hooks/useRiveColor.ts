import { useCallback } from 'react';
import type {
  ViewModelColorProperty,
  ViewModelInstance,
} from '../specs/ViewModel.nitro';
import { useRiveProperty } from './useRiveProperty';
import { RiveColor } from '../core/RiveColor';
import type {
  PathsOfKind,
  TypedViewModelInstance,
} from '../core/TypedViewModelInstance';
import type { RiveFileSchema } from '../core/TypedRiveFile';

const getColorProperty = (vmi: ViewModelInstance, p: string) =>
  vmi.colorProperty(p);

export interface UseRiveColorResult {
  value: RiveColor | undefined;
  setValue: (value: RiveColor | string) => void;
  error: Error | null;
}

/**
 * Hook for interacting with color ViewModel instance properties.
 *
 * @param path - The path to the color property
 * @param viewModelInstance - The ViewModelInstance containing the color property to operate on
 * @returns An object with the color value as RGBA, a setter function that accepts either RGBA or hex string, and an error if the property is not found
 */
export function useRiveColor<
  T extends RiveFileSchema,
  N extends Extract<keyof T['viewModels'], string>,
>(
  path: PathsOfKind<T, N, 'color'>,
  viewModelInstance?: TypedViewModelInstance<T, N> | null
): UseRiveColorResult;
export function useRiveColor(
  path: string,
  viewModelInstance?: ViewModelInstance | null
): UseRiveColorResult;
export function useRiveColor(
  path: string,
  viewModelInstance?: ViewModelInstance | null
): UseRiveColorResult {
  const [rawValue, setRawValue, error] = useRiveProperty<
    ViewModelColorProperty,
    number
  >(viewModelInstance, path, getColorProperty);

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
