import {
  getHostComponent,
  NitroModules,
  type ReactNativeView,
  type HybridView,
} from 'react-native-nitro-modules';
import type { Rive } from './specs/Rive.nitro';
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

import RiveViewConfig from '../nitrogen/generated/shared/json/RiveViewConfig.json';

const RiveHybridObject = NitroModules.createHybridObject<Rive>('Rive');

export function multiply(a: number, b: number): number {
  return RiveHybridObject.multiply(a, b);
}

type NativeRiveViewPropsInternal = Omit<NativeRiveViewProps, 'onError'> & {
  onError: { f: (message: string) => void };
};

export const NitroRiveView = getHostComponent<
  NativeRiveViewPropsInternal,
  RiveViewMethods
>('RiveView', () => RiveViewConfig) as ReactNativeView<
  NativeRiveViewPropsInternal,
  RiveViewTSMethods
>;

export { RiveView, type RiveViewProps } from './core/RiveView';
export type { RiveViewMethods };
export type RiveViewRef = HybridView<
  NativeRiveViewPropsInternal,
  RiveViewTSMethods
>;
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
} from './specs/ViewModel.nitro';
export { Fit } from './core/Fit';
export { Alignment } from './core/Alignment';
export { RiveFileFactory } from './core/RiveFile';
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
export { useRiveFile } from './hooks/useRiveFile';
export { type RiveFileInput } from './hooks/useRiveFile';
export { DataBindMode };
