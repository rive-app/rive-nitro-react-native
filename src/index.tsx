import { getHostComponent, NitroModules } from 'react-native-nitro-modules';
import type { Rive } from './specs/Rive.nitro';
import type { RiveViewMethods, RiveViewProps } from './specs/RiveView.nitro';
import RiveViewConfig from '../nitrogen/generated/shared/json/RiveViewConfig.json';

const RiveHybridObject = NitroModules.createHybridObject<Rive>('Rive');

export function multiply(a: number, b: number): number {
  return RiveHybridObject.multiply(a, b);
}

export const RiveView = getHostComponent<RiveViewProps, RiveViewMethods>(
  'RiveView',
  () => RiveViewConfig
);

export type { RiveViewProps, RiveViewMethods } from './specs/RiveView.nitro';
