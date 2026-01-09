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
 * @param runOnUI - The runOnUI function from react-native-reanimated
 *
 * @example
 * ```tsx
 * import { installWorkletDispatcher } from '@rive-app/react-native';
 * import { runOnUI } from 'react-native-reanimated';
 *
 * // Call once at app startup
 * installWorkletDispatcher(runOnUI);
 * ```
 */
export function installWorkletDispatcher(
  runOnUI: <Args extends unknown[], ReturnValue>(
    worklet: (...args: Args) => ReturnValue
  ) => (...args: Args) => void
): void {
  if (isInstalled) {
    return;
  }
  isInstalled = true;

  // Create bridge on JS thread
  const bridge =
    NitroModules.createHybridObject<RiveWorkletBridge>('RiveWorkletBridge');

  // Box it so we can use it in worklet
  const boxedBridge = NitroModules.box(bridge);

  // Call install on Reanimated's UI runtime so dispatcher is installed there
  runOnUI(() => {
    'worklet';
    const b = boxedBridge.unbox();
    b.install();
  })();
}
