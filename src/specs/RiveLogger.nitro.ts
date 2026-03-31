import type { HybridObject } from 'react-native-nitro-modules';

export interface RiveLogger
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  setHandler(
    handler: (level: string, tag: string, message: string) => void
  ): void;
  resetHandler(): void;
}
