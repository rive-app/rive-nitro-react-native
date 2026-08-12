import {
  expectType,
  expectError,
  expectAssignable,
  expectDeprecated,
  expectNotDeprecated,
} from 'tsd';
import type { TypedRiveFile, RiveAsset } from '../../src/core/TypedRiveFile';
import type {
  TypedViewModelInstance,
  TypedViewModelEnumProperty,
  UntypedViewModelInstance,
} from '../../src/core/TypedViewModelInstance';
import type {
  ViewModelInstance,
  ViewModelNumberProperty,
  ViewModelTriggerProperty,
  ViewModelBooleanProperty,
  ViewModelListProperty,
} from '../../src/specs/ViewModel.nitro';
import type { RiveFile } from '../../src/specs/RiveFile.nitro';
import type { UseRivePropertyResult } from '../../src/types';
import { useRiveNumber } from '../../src/hooks/useRiveNumber';
import { useRiveEnum } from '../../src/hooks/useRiveEnum';
import { useViewModelInstance } from '../../src/hooks/useViewModelInstance';
import { RiveView, type RiveViewProps } from '../../src/core/RiveView';
import gradientBorderRiv from '../../example/assets/rive/GradientBorder.riv';
import blinkoRiv from '../../example/assets/rive/blinko.riv';
import rewardsRiv from '../../example/assets/rive/rewards.riv';
import fallbackFontsRiv from '../../example/assets/rive/fallback_fonts.riv';

// Infer schemas from the generated .riv.d.ts assets
type GradientBorderSchema = typeof gradientBorderRiv extends RiveAsset<infer T>
  ? T
  : never;
type BlinkoSchema = typeof blinkoRiv extends RiveAsset<infer T> ? T : never;

declare const gradientFile: TypedRiveFile<GradientBorderSchema>;
declare const blinkoFile: TypedRiveFile<BlinkoSchema>;
declare const untypedFile: TypedRiveFile;

// --- TypedRiveFile assignability ---

// Typed files are assignable to the untyped base (backward compat)
expectAssignable<TypedRiveFile>(gradientFile);
expectAssignable<TypedRiveFile>(blinkoFile);

// --- Single-artboard: artboardName constraints ---

expectAssignable<RiveViewProps<GradientBorderSchema>>({
  file: gradientFile,
  artboardName: 'Layout',
});

// Wrong artboard name must error
expectError<RiveViewProps<GradientBorderSchema>>({
  file: gradientFile,
  artboardName: 'NotAnArtboard',
});

// --- Single-artboard: stateMachineName constraints ---

expectAssignable<RiveViewProps<GradientBorderSchema>>({
  file: gradientFile,
  stateMachineName: 'State',
});

// Wrong SM name must error
expectError<RiveViewProps<GradientBorderSchema>>({
  file: gradientFile,
  stateMachineName: 'NonexistentSM',
});

// --- Multi-artboard: default artboard (A not specified) ---
// When artboardName is not specified, A defaults to defaultArtboard ('Main').
// artboardName must be 'Main' (or undefined), stateMachineName constrained to Main's SMs.

expectAssignable<RiveViewProps<BlinkoSchema>>({
  file: blinkoFile,
  artboardName: 'Main',
  stateMachineName: 'State Machine 1',
});

expectAssignable<RiveViewProps<BlinkoSchema>>({
  file: blinkoFile,
  stateMachineName: 'State Machine 1',
});

// Non-default artboard without explicit A type parameter must error
expectError<RiveViewProps<BlinkoSchema>>({
  file: blinkoFile,
  artboardName: 'StoreItem',
});

// Invalid SM on default artboard must error
expectError<RiveViewProps<BlinkoSchema>>({
  file: blinkoFile,
  stateMachineName: 'Nonexistent SM',
});

// --- Multi-artboard: explicit non-default artboard (A specified) ---
// Specifying A constrains artboardName and stateMachineName to that artboard.

expectAssignable<RiveViewProps<BlinkoSchema, 'StoreItem'>>({
  file: blinkoFile,
  artboardName: 'StoreItem',
  stateMachineName: 'State Machine 1',
});

// Wrong artboard when A = 'StoreItem' must error
expectError<RiveViewProps<BlinkoSchema, 'StoreItem'>>({
  file: blinkoFile,
  artboardName: 'Puck',
});

// Wrong SM when A = 'StoreItem' must error
expectError<RiveViewProps<BlinkoSchema, 'StoreItem'>>({
  file: blinkoFile,
  artboardName: 'StoreItem',
  stateMachineName: 'Nonexistent SM',
});

// --- Untyped file: accepts any string (backward compat) ---

expectAssignable<RiveViewProps>({
  file: untypedFile,
  artboardName: 'anything',
  stateMachineName: 'anything',
});

// --- RiveView with an asset-annotated file (TypedRiveFile<typeof riv>) ---
// The generic must accept the RiveAsset form, not just bare schemas —
// otherwise inference silently falls back to the base schema and name
// checking is disabled for the documented `TypedRiveFile<typeof riv>` pattern.

declare const assetTypedFile: TypedRiveFile<typeof blinkoRiv>;

RiveView({ file: assetTypedFile, artboardName: 'Main' });
RiveView({
  file: assetTypedFile,
  artboardName: 'Main',
  stateMachineName: 'State Machine 1',
});
expectError(RiveView({ file: assetTypedFile, artboardName: 'NotAnArtboard' }));
expectError(
  RiveView({
    file: assetTypedFile,
    artboardName: 'Main',
    stateMachineName: 'Nonexistent SM',
  })
);

// --- RiveAsset branding ---

declare const gradientAsset: RiveAsset<GradientBorderSchema>;

// RiveAsset is a branded number
expectType<number & { readonly __riveSchema?: GradientBorderSchema }>(
  gradientAsset
);

// RiveAsset with wrong schema is not assignable to a different typed asset
expectError<RiveAsset<BlinkoSchema>>(gradientAsset);

// ============================================================
// TypedViewModelInstance
// ============================================================

// Blinko storeVM: xbuttonClick:trigger, multiplierValue:number,
//   storeOpen:boolean, 'property of pegVM':viewModel:pegVM
// pegVM: blink:trigger, multiplierValue:number, pegType:enumType

type StoreVMInstance = TypedViewModelInstance<BlinkoSchema, 'storeVM'>;
type PegVMInstance = TypedViewModelInstance<BlinkoSchema, 'pegVM'>;

declare const storeVM: StoreVMInstance;

// --- Direct property access ---

// Valid number property
expectAssignable<ViewModelNumberProperty | undefined>(
  storeVM.numberProperty('multiplierValue')
);

// Valid trigger property
expectAssignable<ViewModelTriggerProperty | undefined>(
  storeVM.triggerProperty('xbuttonClick')
);

// Valid boolean property
expectAssignable<ViewModelBooleanProperty | undefined>(
  storeVM.booleanProperty('storeOpen')
);

// Wrong kind: xbuttonClick is 'trigger', not 'number'
expectError(storeVM.numberProperty('xbuttonClick'));

// Nonexistent property name must error
expectError(storeVM.numberProperty('doesNotExist'));

// --- Nested viewModel access ---

// Accessing a viewModel reference returns the correct typed instance
expectAssignable<PegVMInstance | undefined>(
  storeVM.viewModel('property of pegVM')
);

// Non-viewModel property name is rejected for viewModel()
expectError(storeVM.viewModel('xbuttonClick'));

// Nonexistent path is rejected
expectError(storeVM.viewModel('notAProperty'));

// --- Chained nested access ---

// storeVM → pegVM → pegVM.numberProperty('multiplierValue')
expectAssignable<ViewModelNumberProperty | undefined>(
  storeVM.viewModel('property of pegVM')?.numberProperty('multiplierValue')
);

// storeVM → pegVM → wrong property kind errors
expectError(
  storeVM.viewModel('property of pegVM')?.numberProperty('blink')
);

// storeVM → pegVM → nonexistent property errors
expectError(
  storeVM.viewModel('property of pegVM')?.stringProperty('doesNotExist')
);

// --- Enum property ---

// pegVM.pegType is 'enum:normal|multiplier' — returns typed enum property
expectAssignable<
  TypedViewModelEnumProperty<'normal' | 'multiplier'> | undefined
>(storeVM.viewModel('property of pegVM')?.enumProperty('pegType'));

// The enum value type is exactly 'normal' | 'multiplier'
expectType<TypedViewModelEnumProperty<'normal' | 'multiplier'> | undefined>(
  storeVM.viewModel('property of pegVM')?.enumProperty('pegType')
);

// All enum property setters are narrowed to the declared values
declare const pegTypeProp: TypedViewModelEnumProperty<'normal' | 'multiplier'>;
pegTypeProp.set('normal');
expectType<Promise<void>>(pegTypeProp.setValueAsync('multiplier'));
expectError(pegTypeProp.set('bogus'));
expectError(pegTypeProp.setValueAsync('bogus'));

// Non-enum property rejected for enumProperty()
expectError(storeVM.enumProperty('xbuttonClick'));

// Nonexistent property rejected
expectError(storeVM.enumProperty('doesNotExist'));

// --- List property ---

// storeVM.items is a 'list' — path is constrained, the property itself is the
// plain runtime type: the schema cannot know which ViewModel a list holds at a
// given index, and a union element would make every accessor parameter
// intersect to `never` (unusable).
expectType<ViewModelListProperty | undefined>(storeVM.listProperty('items'));

// Non-list property rejected for listProperty()
expectError(storeVM.listProperty('xbuttonClick'));

// List elements are untyped instances — usable with any accessor / untyped hooks
declare const listProp: ViewModelListProperty;
expectType<Promise<ViewModelInstance | undefined>>(
  listProp.getInstanceAtAsync(0)
);
async function listElementIsUsable() {
  const el = await listProp.getInstanceAtAsync(0);
  el?.numberProperty('anything');
  useRiveNumber('any/path', el);
}
void listElementIsUsable;

// ============================================================
// useRiveNumber
// ============================================================

declare const untypedInstance: UntypedViewModelInstance;
declare const plainInstance: ViewModelInstance;

// Typed overload: valid direct number path → result typed as number
expectType<UseRivePropertyResult<number>>(
  useRiveNumber('multiplierValue', storeVM)
);

// Typed overload: valid nested number path (nested ViewModel)
expectType<UseRivePropertyResult<number>>(
  useRiveNumber('property of pegVM/multiplierValue', storeVM)
);

// Typed overload: wrong kind — xbuttonClick is a trigger, not a number
expectError(useRiveNumber('xbuttonClick', storeVM));

// Typed overload: nonexistent path
expectError(useRiveNumber('doesNotExist', storeVM));

// Typed overload: nested path with wrong property kind
expectError(useRiveNumber('property of pegVM/blink', storeVM));

// Typed instance rejected by untyped overload → forces typed overload → wrong path errors
expectError(useRiveNumber('multiplierValue' as string, storeVM));

// Untyped overload: plain ViewModelInstance accepts any string path
expectType<UseRivePropertyResult<number>>(
  useRiveNumber('any/path', untypedInstance)
);

// Untyped overload: plain ViewModelInstance (no brand) also accepted
expectType<UseRivePropertyResult<number>>(
  useRiveNumber('any/path', plainInstance)
);

// No instance: falls back to untyped overload, still returns number result
expectType<UseRivePropertyResult<number>>(useRiveNumber('multiplierValue'));

// ============================================================
// useViewModelInstance — schema-aware file overloads
// ============================================================

declare const plainFile: RiveFile;

// --- Files without a generated schema degrade to untyped (never `never`) ---
// This is the load-bearing backward-compat guarantee: RiveFileFactory.* and
// useRiveFile(require(...)) produce TypedRiveFile<RiveFileSchema>, and code
// that passes viewModelName + uses untyped hooks must keep compiling.
{
  const { instance } = useViewModelInstance(plainFile, {
    viewModelName: 'AnyNameAtAll',
    async: true,
  });
  expectType<ViewModelInstance | null | undefined>(instance);
  useRiveNumber('score', instance);
  if (instance) {
    instance.numberProperty('score');
    useRiveNumber('nested/path', instance);
  }
}

declare const baseTypedFile: TypedRiveFile;
{
  const { instance } = useViewModelInstance(baseTypedFile, {
    viewModelName: 'AnyNameAtAll',
    async: true,
  });
  expectType<ViewModelInstance | null | undefined>(instance);
  useRiveNumber('score', instance);
}

// --- Schema-typed file + valid viewModelName → typed instance ---
{
  const { instance } = useViewModelInstance(blinkoFile, {
    viewModelName: 'storeVM',
    async: true,
  });
  expectType<
    TypedViewModelInstance<BlinkoSchema, 'storeVM'> | null | undefined
  >(instance);
}

// --- Invalid viewModelName on a schema-typed file is a hard error ---
// It must NOT silently fall through to an untyped overload.
expectError(
  useViewModelInstance(blinkoFile, {
    viewModelName: 'NotAViewModel',
    async: true,
  })
);

// --- Typed file without viewModelName → untyped result (default instance) ---
{
  const { instance } = useViewModelInstance(blinkoFile, { async: true });
  expectType<ViewModelInstance | null | undefined>(instance);
}

// --- required: true keeps its narrowing on the typed overload ---
{
  const { instance } = useViewModelInstance(blinkoFile, {
    viewModelName: 'storeVM',
    async: true,
    required: true,
  });
  expectType<TypedViewModelInstance<BlinkoSchema, 'storeVM'> | undefined>(
    instance
  );
}

// --- Deprecation composes with the typed overloads ---
// Without async: true the sync (JS-thread-blocking) path is used — the typed
// call must carry the same @deprecated marker as the untyped one.
expectDeprecated(useViewModelInstance(blinkoFile, { viewModelName: 'storeVM' }));
expectDeprecated(useViewModelInstance(plainFile));
expectNotDeprecated(
  useViewModelInstance(blinkoFile, { viewModelName: 'storeVM', async: true })
);

// ============================================================
// Schemas without ViewModels still type artboards/state machines
// ============================================================

type FallbackFontsSchema =
  typeof fallbackFontsRiv extends RiveAsset<infer T> ? T : never;
declare const fontsFile: TypedRiveFile<FallbackFontsSchema>;

expectAssignable<RiveViewProps<FallbackFontsSchema>>({
  file: fontsFile,
  artboardName: 'Artboard',
});
expectError<RiveViewProps<FallbackFontsSchema>>({
  file: fontsFile,
  artboardName: 'NotAnArtboard',
});

// A file with no ViewModels accepts no viewModelName at all
expectError(
  useViewModelInstance(fontsFile, { viewModelName: 'anything', async: true })
);

// ============================================================
// useRiveEnum — nested paths (parity with the sibling hooks)
// ============================================================

type RewardsSchema = typeof rewardsRiv extends RiveAsset<infer T> ? T : never;
declare const rewardsVM: TypedViewModelInstance<RewardsSchema, 'Rewards'>;

// Direct enum path on the owning VM
declare const itemVM: TypedViewModelInstance<RewardsSchema, 'Item'>;
expectType<UseRivePropertyResult<'Coin' | 'Gem'>>(
  useRiveEnum('Item_Selection', itemVM)
);

// Nested enum path — Item_Selection on Rewards is 'viewModel:Item'
expectType<UseRivePropertyResult<'Coin' | 'Gem'>>(
  useRiveEnum('Item_Selection/Item_Selection', rewardsVM)
);

// Two-hop nested enum path: Rewards → Item_Value_Icon → Property_Of_Item → Item_Selection
expectType<UseRivePropertyResult<'Coin' | 'Gem'>>(
  useRiveEnum('Item_Value_Icon/Property_Of_Item/Item_Selection', rewardsVM)
);

// Wrong nested enum path errors
expectError(useRiveEnum('Item_Selection/DoesNotExist', rewardsVM));

// Instance accessors accept nested paths too
expectAssignable<ViewModelNumberProperty | undefined>(
  rewardsVM.numberProperty('Item_Value_Icon/Item_Value')
);
expectError(rewardsVM.numberProperty('Item_Value_Icon/DoesNotExist'));
