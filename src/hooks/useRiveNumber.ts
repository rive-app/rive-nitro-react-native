import {
  type ViewModelInstance,
  type ViewModelNumberProperty,
} from '../specs/ViewModel.nitro';
import type { UseRivePropertyResult } from '../types';
import { useRiveProperty } from './useRiveProperty';
import type { PathsOfKind, TypedViewModelInstance } from '../core/TypedViewModelInstance';
import type { RiveFileSchema } from '../core/TypedRiveFile';

const getNumberProperty = (vmi: ViewModelInstance, p: string) =>
  vmi.numberProperty(p);

/**
 * Hook for interacting with number ViewModel instance properties.
 *
 * @param path - The path to the number property
 * @param viewModelInstance - The ViewModelInstance containing the number property to operate on
 * @returns An object with the number value, a setter function, and an error if the property is not found
 */
export function useRiveNumber<
  T extends RiveFileSchema,
  N extends Extract<keyof T['viewModels'], string>,
>(
  path: PathsOfKind<T, N, 'number'>,
  viewModelInstance?: TypedViewModelInstance<T, N> | null
): UseRivePropertyResult<number>;
export function useRiveNumber(
  path: string,
  viewModelInstance?: ViewModelInstance | null
): UseRivePropertyResult<number>;
export function useRiveNumber(
  path: string,
  viewModelInstance?: ViewModelInstance | null
): UseRivePropertyResult<number> {
  const [value, setValue, error] = useRiveProperty<
    ViewModelNumberProperty,
    number
  >(viewModelInstance, path, getNumberProperty);
  return { value, setValue, error };
}
