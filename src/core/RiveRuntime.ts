import { NitroModules } from 'react-native-nitro-modules';
import type { RiveRuntime as RiveRuntimeSpec } from '../specs/RiveRuntime.nitro';

const RiveRuntimeInternal =
  NitroModules.createHybridObject<RiveRuntimeSpec>('RiveRuntime');

export namespace RiveRuntime {
  export async function initialize(): Promise<void> {
    await RiveRuntimeInternal.initialize();
    if (!RiveRuntimeInternal.isInitialized) {
      throw new Error(
        `Rive initialization failed: ${RiveRuntimeInternal.initError ?? 'Unknown error'}`
      );
    }
  }

  export function getStatus(): { isInitialized: boolean; error?: string } {
    return {
      isInitialized: RiveRuntimeInternal.isInitialized,
      error: RiveRuntimeInternal.initError ?? undefined,
    };
  }
}
