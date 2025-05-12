import { NitroModules } from 'react-native-nitro-modules';
import type { RiveFileFactory } from './specs/RiveFile.nitro';

export { default as RiveView } from './RiveViewNativeComponent';
export * from './RiveViewNativeComponent';
export * from './specs/RiveFile.nitro';

export const RiveFileConstructors =
  NitroModules.createHybridObject<RiveFileFactory>('RiveFileFactory');

console.log('RiveFileFactory', RiveFileConstructors.add(1, 9));
