import {
  type ViewModelBooleanProperty,
  type ViewModelInstance,
} from '../specs/ViewModel.nitro';
import type { UseRivePropertyResult } from '../types';
import { useRiveProperty } from './useRiveProperty';
import type { PathsOfKind, TypedViewModelInstance } from '../core/TypedViewModelInstance';
import type { RiveFileSchema } from '../core/TypedRiveFile';

const getBooleanProperty = (vmi: ViewModelInstance, p: string) =>
  vmi.booleanProperty(p);

/**
 * Hook for interacting with boolean ViewModel instance properties.
 *
 * @param path - The path to the boolean property
 * @param viewModelInstance - The ViewModelInstance containing the boolean property to operate on
 * @returns An object with the boolean value, a setter function, and an error if the property is not found
 */
export function useRiveBoolean<
  T extends RiveFileSchema,
  N extends Extract<keyof T['viewModels'], string>,
>(
  path: PathsOfKind<T, N, 'boolean'>,
  viewModelInstance?: TypedViewModelInstance<T, N> | null
): UseRivePropertyResult<boolean>;
export function useRiveBoolean(
  path: string,
  viewModelInstance?: ViewModelInstance | null
): UseRivePropertyResult<boolean>;
export function useRiveBoolean(
  path: string,
  viewModelInstance?: ViewModelInstance | null
): UseRivePropertyResult<boolean> {
  const [value, setValue, error] = useRiveProperty<
    ViewModelBooleanProperty,
    boolean
  >(viewModelInstance, path, getBooleanProperty);
  return { value, setValue, error };
}
