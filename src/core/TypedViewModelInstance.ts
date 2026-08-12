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
import type { RiveAsset, RiveFileSchema, SchemaOf } from './TypedRiveFile';

/**
 * True when nothing is statically known about `T`'s ViewModels — i.e. `T` is
 * the structural base `RiveFileSchema` (index-signature keys) rather than a
 * generated schema with literal names. Every path/name constraint must degrade
 * to `string` in that case, never to `never`: files without a generated schema
 * still work at runtime, so they must keep compiling.
 */
export type IsBaseSchema<T extends RiveFileSchema> =
  string extends Extract<keyof T['viewModels'], string> ? true : false;

/** Split a pipe-separated string literal into a union: 'a|b|c' → 'a' | 'b' | 'c' */
type UnionFromPipe<S extends string> = S extends `${infer A}|${infer B}`
  ? A | UnionFromPipe<B>
  : S;

/** Extract the enum value union from a schema type string like 'enum:cat|dog|frog' */
export type EnumValuesOf<S extends string> = string extends S
  ? string
  : S extends `enum:${infer V}`
    ? UnionFromPipe<V>
    : never;

/**
 * A typed enum property whose value and setter are constrained to the specific enum values
 * extracted from the .riv file schema.
 */
export interface TypedViewModelEnumProperty<Values extends string = string>
  extends Omit<
    ViewModelEnumProperty,
    'value' | 'getValueAsync' | 'set' | 'setValueAsync' | 'addListener'
  > {
  /** @deprecated Use getValueAsync (read) or set(value) (write) instead */
  value: Values;
  getValueAsync(): Promise<Values>;
  set(value: Values): void;
  setValueAsync(value: Values): Promise<void>;
  addListener(onChanged: (value: Values) => void): () => void;
}

/**
 * Property names whose type matches the given Kind.
 * Use kind `'enum'` to match any enum property (stored as `'enum:val1|val2'` in the schema).
 * Degrades to `string` when the ViewModel shape is not statically known.
 */
export type VMPropsOfKind<
  VM extends Record<string, string>,
  Kind extends string,
> =
  string extends Extract<keyof VM, string>
    ? string
    : {
        [K in keyof VM]: Kind extends 'enum'
          ? VM[K] extends `enum:${string}`
            ? K
            : never
          : VM[K] extends Kind
            ? K
            : never;
      }[keyof VM] &
        string;

/** Extract the referenced ViewModel name from 'viewModel:SomeName' */
export type VMRefName<TypeStr extends string> = string extends TypeStr
  ? string
  : TypeStr extends `viewModel:${infer Name}`
    ? Name
    : never;

/** Property names that are viewModel references (type = 'viewModel:*') */
export type VMRefPropNames<VM extends Record<string, string>> =
  string extends Extract<keyof VM, string>
    ? string
    : {
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

/**
 * Nesting depth for path recursion. Capped so that cyclic ViewModel reference
 * graphs (A → B → A) terminate; 2 extra hops covers paths like 'a/b/leaf'.
 */
type NestDepth = 0 | 1 | 2;
type PrevDepth = { 0: 0; 1: 0; 2: 1 };

type NestedPathsOfKind<
  T extends RiveFileSchema,
  VMName extends keyof T['viewModels'] & string,
  Kind extends string,
  Depth extends NestDepth,
> = Depth extends 0
  ? never
  : {
      [P in VMRefPropNames<
        T['viewModels'][VMName]
      >]: `${P}/${PathsOfKind<T, VMRefNameResolved<T, VMName, P & keyof T['viewModels'][VMName]>, Kind, PrevDepth[Depth]>}`;
    }[VMRefPropNames<T['viewModels'][VMName]>];

/**
 * All valid property paths of a given kind, including nested ViewModel paths
 * (up to two hops deep — deeper paths need a cast).
 * Direct paths: `'Price_Value'`
 * Nested paths: `'Coin/Item_Value'`, `'Coin/Property_Of_Item/Item_Selection'`
 * Degrades to `string` when the schema is not statically known.
 */
export type PathsOfKind<
  T extends RiveFileSchema,
  VMName extends keyof T['viewModels'] & string,
  Kind extends string,
  Depth extends NestDepth = 2,
> =
  IsBaseSchema<T> extends true
    ? string
    :
        | VMPropsOfKind<T['viewModels'][VMName], Kind>
        | NestedPathsOfKind<T, VMName, Kind, Depth>;

/**
 * The schema type string found at a (possibly nested) property path,
 * e.g. `'number'` or `'enum:Coin|Gem'`. `string` when the schema is not
 * statically known.
 */
export type PropTypeAtPath<
  T extends RiveFileSchema,
  VMName extends keyof T['viewModels'] & string,
  P extends string,
> =
  IsBaseSchema<T> extends true
    ? string
    : P extends `${infer Head}/${infer Rest}`
      ? Head extends VMRefPropNames<T['viewModels'][VMName]>
        ? PropTypeAtPath<
            T,
            VMRefNameResolved<T, VMName, Head & keyof T['viewModels'][VMName]>,
            Rest
          >
        : never
      : P extends keyof T['viewModels'][VMName] & string
        ? T['viewModels'][VMName][P] & string
        : never;

/**
 * A ViewModelInstance typed to a specific ViewModel schema entry.
 * Property accessor methods are constrained to valid property paths (direct or
 * nested, e.g. `'Coin/Item_Value'`).
 * `.viewModel(path)` returns a TypedViewModelInstance for the referenced ViewModel.
 * List elements are untyped — the schema cannot know which ViewModel a list
 * holds at a given index.
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
    path: PathsOfKind<T, VMName, 'number'>
  ): ViewModelNumberProperty | undefined;

  stringProperty(
    path: PathsOfKind<T, VMName, 'string'>
  ): ViewModelStringProperty | undefined;

  booleanProperty(
    path: PathsOfKind<T, VMName, 'boolean'>
  ): ViewModelBooleanProperty | undefined;

  colorProperty(
    path: PathsOfKind<T, VMName, 'color'>
  ): ViewModelColorProperty | undefined;

  triggerProperty(
    path: PathsOfKind<T, VMName, 'trigger'>
  ): ViewModelTriggerProperty | undefined;

  enumProperty<P extends PathsOfKind<T, VMName, 'enum'>>(
    path: P
  ):
    | TypedViewModelEnumProperty<EnumValuesOf<PropTypeAtPath<T, VMName, P>>>
    | undefined;

  imageProperty(
    path: PathsOfKind<T, VMName, 'image'>
  ): ViewModelImageProperty | undefined;

  listProperty(
    path: PathsOfKind<T, VMName, 'list'>
  ): ViewModelListProperty | undefined;

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

  /** Brand that prevents typed instances from matching untyped hook overloads. */
  readonly __vmBrand: [T, VMName];
}

/**
 * A plain ViewModelInstance with no schema type information.
 * Used in the untyped hook overloads — typed instances are intentionally
 * excluded so TypeScript picks the typed overload when a schema is known.
 */
export type UntypedViewModelInstance = ViewModelInstance & {
  __vmBrand?: never;
};

/**
 * Convenience alias: infer the ViewModel instance type directly from a RiveAsset import.
 *
 * @example
 * import rewardsRiv from './rewards.riv';
 * type RewardsInstance = TypedViewModelOf<typeof rewardsRiv, 'Rewards'>;
 */
export type TypedViewModelOf<
  T extends RiveFileSchema | RiveAsset,
  VMName extends Extract<keyof SchemaOf<T>['viewModels'], string>,
> = TypedViewModelInstance<SchemaOf<T>, VMName>;
