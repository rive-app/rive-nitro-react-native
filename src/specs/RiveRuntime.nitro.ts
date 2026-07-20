import type { HybridObject } from 'react-native-nitro-modules';

export type AndroidRenderBackend = 'opengl' | 'vulkan';

export interface RiveRuntime
  extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
  }> {
  initialize(): Promise<void>;
  readonly isInitialized: boolean;
  readonly initError: string | undefined;
  setAndroidRenderBackend(backend: AndroidRenderBackend): void;
}
