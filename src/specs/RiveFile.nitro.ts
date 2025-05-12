import { type HybridObject } from 'react-native-nitro-modules';

export interface RiveFileFactory
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  add(a: number, b: number): number;
}
