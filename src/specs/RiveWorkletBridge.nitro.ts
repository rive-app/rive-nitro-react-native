import type { HybridObject } from 'react-native-nitro-modules';

export interface RiveWorkletBridge
  extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  install(): void;
}
