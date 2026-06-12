import type {
  ViewModelInstance,
  ViewModelNumberProperty,
  ViewModelStringProperty,
  ViewModelBooleanProperty,
  ViewModelColorProperty,
  ViewModelTriggerProperty,
  ViewModelEnumProperty,
  ViewModelImageProperty,
  ViewModelListProperty,
} from '../specs/ViewModel.nitro';
import type { RiveFileSchema } from './TypedRiveFile';

/**
 * A typed list property whose elements are ViewModelInstances from the same file.
 * Elements can be any ViewModel defined in the file — the exact type is unknown
 * until runtime, so the element type is a union of all file ViewModels.
 */
export interface TypedViewModelListProperty<
  T extends RiveFileSchema,
> extends Omit<ViewModelListProperty, 'getInstanceAtAsync' | 'getInstanceAt'> {
  getInstanceAtAsync(
    index: number
  ): Promise<
    | TypedViewModelInstance<T, Extract<keyof T['viewModels'], string>>
    | undefined
  >;
  /** @deprecated Use getInstanceAtAsync instead */
  getInstanceAt(
    index: number
  ):
    | TypedViewModelInstance<T, Extract<keyof T['viewModels'], string>>
    | undefined;
}

/** Property names whose type literal matches the given Kind */
export type VMPropsOfKind<
  VM extends Record<string, string>,
  Kind extends string,
> = {
  [K in keyof VM]: VM[K] extends Kind ? K : never;
}[keyof VM] &
  string;

/** Extract the referenced ViewModel name from 'viewModel:SomeName' */
export type VMRefName<TypeStr extends string> =
  TypeStr extends `viewModel:${infer Name}` ? Name : never;

/** Property names that are viewModel references (type = 'viewModel:*') */
export type VMRefPropNames<VM extends Record<string, string>> = {
  [K in keyof VM]: VM[K] extends `viewModel:${string}` ? K : never;
}[keyof VM] &
  string;

/** Resolved ViewModel name for a nested viewModel reference property */
type VMRefNameResolved<
  T extends RiveFileSchema,
  VMName extends keyof T['viewModels'] & string,
  P extends keyof T['viewModels'][VMName],
> = VMRefName<T['viewModels'][VMName][P] & string> &
  Extract<keyof T['viewModels'], string>;

type NestedPathsOfKind<
  T extends RiveFileSchema,
  VMName extends keyof T['viewModels'] & string,
  Kind extends string,
> = {
  [P in VMRefPropNames<
    T['viewModels'][VMName]
  >]: `${P}/${VMPropsOfKind<T['viewModels'][VMRefNameResolved<T, VMName, P>], Kind>}`;
}[VMRefPropNames<T['viewModels'][VMName]>];

/**
 * All valid property paths of a given kind, including one level of nested ViewModel paths.
 * Direct paths: `'Price_Value'`
 * Nested paths: `'Coin/Item_Value'`
 */
export type PathsOfKind<
  T extends RiveFileSchema,
  VMName extends keyof T['viewModels'] & string,
  Kind extends string,
> =
  | VMPropsOfKind<T['viewModels'][VMName], Kind>
  | NestedPathsOfKind<T, VMName, Kind>;

/**
 * A ViewModelInstance typed to a specific ViewModel schema entry.
 * Property accessor methods are constrained to valid property names.
 * `.viewModel(path)` returns a TypedViewModelInstance for the referenced ViewModel.
 *
 * Obtain via `useViewModelInstance(typedFile, { viewModelName: 'MyVM' })`.
 */
export interface TypedViewModelInstance<
  T extends RiveFileSchema,
  VMName extends keyof T['viewModels'] & string,
> extends Omit<
  ViewModelInstance,
  | 'numberProperty'
  | 'stringProperty'
  | 'booleanProperty'
  | 'colorProperty'
  | 'triggerProperty'
  | 'enumProperty'
  | 'imageProperty'
  | 'listProperty'
  | 'viewModel'
  | 'viewModelAsync'
> {
  numberProperty(
    path: VMPropsOfKind<T['viewModels'][VMName], 'number'>
  ): ViewModelNumberProperty | undefined;

  stringProperty(
    path: VMPropsOfKind<T['viewModels'][VMName], 'string'>
  ): ViewModelStringProperty | undefined;

  booleanProperty(
    path: VMPropsOfKind<T['viewModels'][VMName], 'boolean'>
  ): ViewModelBooleanProperty | undefined;

  colorProperty(
    path: VMPropsOfKind<T['viewModels'][VMName], 'color'>
  ): ViewModelColorProperty | undefined;

  triggerProperty(
    path: VMPropsOfKind<T['viewModels'][VMName], 'trigger'>
  ): ViewModelTriggerProperty | undefined;

  enumProperty(
    path: VMPropsOfKind<T['viewModels'][VMName], 'enumType'>
  ): ViewModelEnumProperty | undefined;

  imageProperty(
    path: VMPropsOfKind<T['viewModels'][VMName], 'image'>
  ): ViewModelImageProperty | undefined;

  listProperty(
    path: VMPropsOfKind<T['viewModels'][VMName], 'list'>
  ): TypedViewModelListProperty<T> | undefined;

  /** Access a nested ViewModel instance; return type is typed to the referenced ViewModel. */
  viewModel<P extends VMRefPropNames<T['viewModels'][VMName]>>(
    path: P
  ):
    | TypedViewModelInstance<
        T,
        VMRefName<T['viewModels'][VMName][P]> & keyof T['viewModels'] & string
      >
    | undefined;

  viewModelAsync<P extends VMRefPropNames<T['viewModels'][VMName]>>(
    path: P
  ): Promise<
    | TypedViewModelInstance<
        T,
        VMRefName<T['viewModels'][VMName][P]> & keyof T['viewModels'] & string
      >
    | undefined
  >;
}
