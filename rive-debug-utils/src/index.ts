import { Platform } from 'react-native';
import { NitroModules } from 'react-native-nitro-modules';
import type { DebugUtils } from './specs/DebugUtils.nitro';

export type { DebugUtils };

let cached: DebugUtils | null | undefined;

/**
 * Returns the native debug helpers, or null when unavailable
 * (iOS, or an app that doesn't link rive-debug-utils).
 */
export function getDebugUtils(): DebugUtils | null {
  if (cached !== undefined) return cached;
  if (Platform.OS !== 'android') {
    cached = null;
    return cached;
  }
  try {
    cached = NitroModules.createHybridObject<DebugUtils>('DebugUtils');
  } catch {
    cached = null;
  }
  return cached;
}
