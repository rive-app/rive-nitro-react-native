import {
  type ViewModelEnumProperty,
  type ViewModelInstance,
} from '../specs/ViewModel.nitro';
import type { UseRivePropertyResult } from '../types';
import type { RiveFileSchema } from '../core/TypedRiveFile';
import {
  type EnumValuesOf,
  type TypedViewModelInstance,
  type UntypedViewModelInstance,
  type VMPropsOfKind,
} from '../core/TypedViewModelInstance';
import { useRiveProperty } from './useRiveProperty';

const getEnumProperty = (vmi: ViewModelInstance, p: string) =>
  vmi.enumProperty(p);

export function useRiveEnum<
  T extends RiveFileSchema,
  N extends Extract<keyof T['viewModels'], string>,
  P extends VMPropsOfKind<T['viewModels'][N], 'enum'>,
>(
  path: P,
  viewModelInstance?: TypedViewModelInstance<T, N> | null
): UseRivePropertyResult<EnumValuesOf<T['viewModels'][N][P]>>;

export function useRiveEnum(
  path: string,
  viewModelInstance?: UntypedViewModelInstance | null
): UseRivePropertyResult<string>;

export function useRiveEnum(
  path: string,
  viewModelInstance?: ViewModelInstance | null
): UseRivePropertyResult<string> {
  const [value, setValue, error] = useRiveProperty<
    ViewModelEnumProperty,
    string
  >(viewModelInstance, path, getEnumProperty);
  return { value, setValue, error };
}
