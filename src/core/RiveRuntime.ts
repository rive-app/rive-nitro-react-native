import { NitroModules } from 'react-native-nitro-modules';
import type {
  AndroidRenderBackend,
  RiveRuntime as RiveRuntimeSpec,
} from '../specs/RiveRuntime.nitro';

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

  /**
   * Selects the render backend used by the experimental Android backend.
   * Applies process-wide and must be called before any Rive file is loaded —
   * once the shared render worker exists the choice is fixed.
   *
   * Vulkan requires Android 10 (API 29) or newer; the runtime automatically
   * falls back to OpenGL when Vulkan is unavailable or fails to initialize.
   * No-op on iOS and on the legacy Android backend.
   */
  export function setAndroidRenderBackend(backend: AndroidRenderBackend) {
    RiveRuntimeInternal.setAndroidRenderBackend(backend);
  }

  /**
   * Enables Rive's GPU Canvas renderer, which is required to render 3D
   * content. Applies process-wide and must be called before any Rive file is
   * loaded — once the shared render worker exists the choice is fixed and a
   * later call is ignored with a warning.
   *
   * Disabled by default. Backed by `Worker(configuration:)` on iOS and by
   * rive-android's experimental deferred renderer on Android. No-op on the
   * legacy runtime.
   */
  export function setGPUCanvasEnabled(enabled: boolean) {
    RiveRuntimeInternal.setGPUCanvasEnabled(enabled);
  }

  /**
   * Whether GPU Canvas is in effect: the setting the shared render worker was
   * created with, or the requested setting while no worker exists yet.
   */
  export function isGPUCanvasEnabled(): boolean {
    return RiveRuntimeInternal.isGPUCanvasEnabled;
  }
}
