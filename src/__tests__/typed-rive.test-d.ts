import { expectType, expectError, expectAssignable } from 'tsd';
import type { TypedRiveFile, RiveAsset } from '../../src/core/TypedRiveFile';
import type {
  TypedViewModelInstance,
  TypedViewModelListProperty,
  TypedViewModelEnumProperty,
  UntypedViewModelInstance,
} from '../../src/core/TypedViewModelInstance';
import type {
  ViewModelInstance,
  ViewModelNumberProperty,
  ViewModelTriggerProperty,
  ViewModelBooleanProperty,
} from '../../src/specs/ViewModel.nitro';
import type { UseRivePropertyResult } from '../../src/types';
import { useRiveNumber } from '../../src/hooks/useRiveNumber';
import type { RiveViewProps } from '../../src/core/RiveView';
import gradientBorderRiv from '../../example/assets/rive/GradientBorder.riv';
import blinkoRiv from '../../example/assets/rive/blinko.riv';

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

// Non-enum property rejected for enumProperty()
expectError(storeVM.enumProperty('xbuttonClick'));

// Nonexistent property rejected
expectError(storeVM.enumProperty('doesNotExist'));

// --- List property ---

// storeVM.items is a 'list' — returns a typed list property
expectAssignable<TypedViewModelListProperty<BlinkoSchema> | undefined>(
  storeVM.listProperty('items')
);

// Non-list property rejected for listProperty()
expectError(storeVM.listProperty('xbuttonClick'));

// List element is a union of all file ViewModels (any one of them)
type AnyBlinkoVM = TypedViewModelInstance<
  BlinkoSchema,
  Extract<keyof BlinkoSchema['viewModels'], string>
>;
declare const list: TypedViewModelListProperty<BlinkoSchema>;
expectAssignable<Promise<AnyBlinkoVM | undefined>>(list.getInstanceAtAsync(0));

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
