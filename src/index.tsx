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
export type { RiveFile } from './specs/RiveFile.nitro';
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
} from './specs/ViewModel.nitro';
export { Fit } from './core/Fit';
export { Alignment } from './core/Alignment';
export { RiveFileFactory } from './core/RiveFile';
export { RiveImages } from './core/RiveImages';
export type { RiveImage } from './specs/RiveImage.nitro';
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
export { useViewModelInstance } from './hooks/useViewModelInstance';
export { useRiveFile } from './hooks/useRiveFile';
export { type RiveFileInput } from './hooks/useRiveFile';
export { DataBindMode };
