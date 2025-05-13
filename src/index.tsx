import { NitroModules } from 'react-native-nitro-modules';
import type { Rive } from './specs/Rive.nitro';

const RiveHybridObject = NitroModules.createHybridObject<Rive>('Rive');

export function multiply(a: number, b: number): number {
  return RiveHybridObject.multiply(a, b);
}
