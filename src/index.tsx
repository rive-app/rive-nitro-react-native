import { type HybridView } from 'react-native-nitro-modules';
import {
  type RiveViewMethods,
  type RiveViewTSMethods,
  type RiveViewProps as NativeRiveViewProps,
  DataBindMode,
  type DataBindByName as DataBindByNameInterface,
} from './specs/RiveView.nitro';

export class DataBindByName implements DataBindByNameInterface {
  byName: string;
  constructor(name: string) {
    this.byName = name;
  }
}

export { NitroRiveView } from './core/NitroRiveViewComponent';

export { RiveView, type RiveViewProps } from './core/RiveView';
export type { RiveViewMethods };
export type RiveViewRef = HybridView<NativeRiveViewProps, RiveViewTSMethods>;
export type { FrameRateRange } from './specs/RiveView.nitro';
export type {
  RiveFile,
  RiveEnumDefinition,
  RiveAssetType,
} from './specs/RiveFile.nitro';
export type {
  RiveAsset,
  RiveFileSchema,
  SchemaOf,
  TypedRiveFile,
} from './core/TypedRiveFile';
export type {
  TypedViewModelInstance,
  TypedViewModelOf,
  UntypedViewModelInstance,
  TypedViewModelEnumProperty,
  PathsOfKind,
  PropTypeAtPath,
  EnumValuesOf,
} from './core/TypedViewModelInstance';
export type {
  ViewModel,
  ViewModelInstance,
  ViewModelNumberProperty,
  ViewModelStringProperty,
  ViewModelBooleanProperty,
  ViewModelColorProperty,
  ViewModelEnumProperty,
  ViewModelTriggerProperty,
  ViewModelImageProperty,
  ViewModelListProperty,
  ViewModelArtboardProperty,
  ViewModelPropertyType,
  ViewModelPropertyInfo,
} from './specs/ViewModel.nitro';
export type { BindableArtboard } from './specs/BindableArtboard.nitro';
export { Fit } from './core/Fit';
export { Alignment } from './core/Alignment';
export { Semantics } from './core/Semantics';
export { RiveFileFactory } from './core/RiveFile';
export { RiveImages } from './core/RiveImages';
export type { RiveImage } from './specs/RiveImage.nitro';
export {
  RiveFonts,
  type FontSource,
  type FontWeight,
  type FallbackFontMap,
} from './core/RiveFonts';
export type { FallbackFont } from './specs/RiveFontConfig.nitro';
export { RiveColor } from './core/RiveColor';
export { type RiveEvent, RiveEventType } from './core/Events';
export { type RiveError, RiveErrorType } from './core/Errors';
export { ArtboardByIndex, ArtboardByName } from './specs/ArtboardBy';
export { useRive } from './hooks/useRive';
export { useRiveNumber } from './hooks/useRiveNumber';
export { useRiveString } from './hooks/useRiveString';
export { useRiveBoolean } from './hooks/useRiveBoolean';
export { useRiveEnum } from './hooks/useRiveEnum';
export { useRiveColor } from './hooks/useRiveColor';
export { useRiveTrigger } from './hooks/useRiveTrigger';
export { useRiveList } from './hooks/useRiveList';
export {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- only the non-async overloads are deprecated; the export itself is current
  useViewModelInstance,
  type UseViewModelInstanceResult,
  type UseViewModelInstanceRequiredResult,
} from './hooks/useViewModelInstance';
export { useRiveFile, type UseRiveFileResult } from './hooks/useRiveFile';
export type {
  TypedReferencedAssets,
  TypedResolvedReferencedAssets,
} from './core/ReferencedAssets';
export { type RiveFileInput } from './hooks/useRiveFile';
export { type SetValueAction } from './types';
export { RiveRuntime } from './core/RiveRuntime';
export type { AndroidRenderBackend } from './specs/RiveRuntime.nitro';
export { RiveLog, type RiveLogLevel } from './core/RiveLogger';
export { DataBindMode };
