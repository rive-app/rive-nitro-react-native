import type { HybridObject } from 'react-native-nitro-modules';

/**
 * Bridge for installing Nitro Dispatcher on the worklets UI runtime.
 */
export interface RiveWorkletBridge
  extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  /**
   * Install the dispatcher on the current runtime.
   * Must be called from the UI runtime (via scheduleOnUI).
   */
  install(): void;
}
