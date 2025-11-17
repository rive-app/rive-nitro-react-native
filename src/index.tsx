import {
  getHostComponent,
  NitroModules,
  type ReactNativeView,
} from 'react-native-nitro-modules';
import type { Rive } from './specs/Rive.nitro';
import {
  type RiveViewMethods,
  type RiveViewTSMethods,
  type RiveViewProps,
  DataBindMode,
  type DataBindByName as DataBindByNameInterface,
} from './specs/RiveView.nitro';

export class DataBindByName implements DataBindByNameInterface {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}


import RiveViewConfig from '../nitrogen/generated/shared/json/RiveViewConfig.json';

const RiveHybridObject = NitroModules.createHybridObject<Rive>('Rive');

export function multiply(a: number, b: number): number {
  return RiveHybridObject.multiply(a, b);
}

/**
 * RiveView is a React Native component that renders Rive animations.
 * It provides a seamless way to display and control Rive graphics in your app.
 *
 * @example
 * ```tsx
 * <RiveView
 *   file={riveFile}
 *   artboardName="New Artboard"
 *   stateMachineName="State Machine 1"
 *   autoPlay={true}
 *   fit={Fit.Contain}
 *   style={styles.riveContainer}
 * />
 * ```
 *
 * @property {RiveFile} file - The Rive file to be displayed
 * @property {string} [artboardName] - Name of the artboard to display from the Rive file
 * @property {string} [stateMachineName] - Name of the state machine to play
 * @property {boolean} [autoBind=true] - Whether to automatically bind the state machine and artboard
 * @property {boolean} [autoPlay=true] - Whether to automatically start playing the state machine
 * @property {Alignment} [alignment] - How the Rive graphic should be aligned within its container
 * @property {Fit} [fit] - How the Rive graphic should fit within its container
 * @property {Object} [style] - React Native style object for container customization
 *
 * The component also exposes methods for controlling playback:
 * - play(): Starts playing the animation
 * - pause(): Pauses the animation
 */
export const RiveView = getHostComponent<RiveViewProps, RiveViewMethods>(
  'RiveView',
  () => RiveViewConfig
) as ReactNativeView<RiveViewProps, RiveViewTSMethods>;

export type { RiveViewProps, RiveViewMethods };
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
