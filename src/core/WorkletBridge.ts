import { NitroModules } from 'react-native-nitro-modules';
import type { RiveWorkletBridge } from '../specs/RiveWorkletBridge.nitro';

let isInstalled = false;

/**
 * Install the Nitro Dispatcher on Reanimated's UI runtime.
 * This enables using HybridObject callbacks (like addListener) from worklets
 * and having shared value updates trigger useAnimatedStyle.
 *
 * Call this once at app startup. It will schedule the installation on the UI thread.
 *
 * Requires react-native-worklets >= 0.7.1 for automatic HybridObject serialization.
 *
 * @param scheduleOnUI - The scheduleOnUI function from react-native-worklets
 *
 * @example
 * ```tsx
 * import { installWorkletDispatcher } from '@rive-app/react-native';
 * import { scheduleOnUI } from 'react-native-worklets';
 *
 * // Call once at app startup
 * installWorkletDispatcher(scheduleOnUI);
 * ```
 */
export function installWorkletDispatcher(
  scheduleOnUI: <Args extends unknown[], ReturnValue>(
    worklet: (...args: Args) => ReturnValue,
    ...args: Args
  ) => void
): void {
  if (isInstalled) {
    return;
  }
  isInstalled = true;

  const bridge =
    NitroModules.createHybridObject<RiveWorkletBridge>('RiveWorkletBridge');

  scheduleOnUI(() => {
    'worklet';
    bridge.install();
  });
}
