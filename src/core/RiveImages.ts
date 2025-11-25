import { NitroModules } from 'react-native-nitro-modules';
import type { RiveImageFactory } from '../specs/RiveImage.nitro';

export const RiveImages =
  NitroModules.createHybridObject<RiveImageFactory>('RiveImageFactory');
