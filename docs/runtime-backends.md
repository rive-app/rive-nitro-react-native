# Runtime notes (contributor guide)

The library is built on Rive's CommandQueue-based async runtime on both
platforms. Behaviors worth knowing when comparing against the Rive SDKs or
older versions of this library:

- The deprecated state-machine-input, text-run, and Rive-event view methods
  throw — use [data binding](https://rive.app/docs/runtimes/data-binding)
  instead.
- Property accessors (`numberProperty(path)` etc.) return unvalidated
  handles; a bad path surfaces via the `getValueAsync()` rejection or the
  `useRive*` hooks' `error` result instead of an `undefined` return.
- `updateReferencedAssets` (runtime asset swapping) is not supported.

## Android render backend

Android renders with OpenGL by default. Vulkan can
be opted into per process:

```ts
import { RiveRuntime } from '@rive-app/react-native';

RiveRuntime.setAndroidRenderBackend('vulkan');
```

Call it before loading any Rive files — the choice is fixed once the shared
render worker is created (a later call logs a warning and is ignored).
Vulkan requires Android 10 (API 29) or newer; rive-android automatically
falls back to OpenGL when Vulkan is unavailable or fails to initialize. The
call is a no-op on iOS.

## GPU Canvas

Rive's GPU Canvas renderer is required for 3D content and is disabled by
default. Opt in per process, before loading any Rive files:

```ts
import { RiveRuntime } from '@rive-app/react-native';

RiveRuntime.setGPUCanvasEnabled(true);
```

The choice is fixed once the shared render worker is created (a later call
logs a warning and is ignored); `RiveRuntime.isGPUCanvasEnabled()` reports the
setting in effect. On iOS this maps to
[`Worker(configuration: .init(enableGPUCanvas: true))`](https://rive.app/docs/runtimes/apple/gpu-canvas);
it needs rive-ios 6.25 or newer, and an older `RiveRuntimeIOSVersion` override
fails to compile. On Android it maps to rive-android's experimental deferred
worker, `CommandQueue(enableGPUCanvas = true)`, which upstream describes as
temporary scaffolding on its way to becoming the default; it needs rive-android
11.14.2 or newer, and an older `Rive_RiveRuntimeAndroidVersion` override fails to
compile.
