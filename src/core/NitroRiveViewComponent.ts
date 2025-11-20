import {
  getHostComponent,
  type ReactNativeView,
} from 'react-native-nitro-modules';
import type {
  RiveViewMethods,
  RiveViewTSMethods,
  RiveViewProps as NativeRiveViewProps,
} from '../specs/RiveView.nitro';
import RiveViewConfig from '../../nitrogen/generated/shared/json/RiveViewConfig.json';

export const NitroRiveView = getHostComponent<
  NativeRiveViewProps,
  RiveViewMethods
>('RiveView', () => RiveViewConfig) as ReactNativeView<
  NativeRiveViewProps,
  RiveViewTSMethods
>;
