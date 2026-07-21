# Runtime backends (contributor guide)

The library ships two native backends and uses the **new** Rive
runtime backend (Rive's CommandQueue-based async API) by default. The
previous implementation is kept as the **legacy** backend **for development
and behavior comparison only** — it is not a supported end-user
configuration and will be removed once the new runtime has fully
proven out. Select it at build time:

- **iOS** — set the Podfile global before `pod install`:

  ```ruby
  # Podfile (before the target block)
  $UseRiveLegacy = true
  ```

  (`USE_RIVE_LEGACY=1 pod install` also works, but the env var only applies
  to that invocation — any plain `pod install` afterwards silently switches
  the project back to the new runtime, so prefer the Podfile
  global.)

- **Android** — set the Gradle property, e.g. in `android/gradle.properties`:

  ```properties
  USE_RIVE_LEGACY=true
  ```

You can check which backend is active at runtime via
`RiveFileFactory.getBackend()` (`'experimental' | 'legacy'`, where
`'experimental'` is the new runtime). This API is for internal testing only —
it and the legacy runtime will be removed in a future release once the new
runtime has fully proven out (not necessarily 0.6).

Behavioral differences on the new runtime:

- The deprecated state-machine-input, text-run, and Rive-event view methods
  throw — use [data binding](https://rive.app/docs/runtimes/data-binding)
  instead.
- Property accessors (`numberProperty(path)` etc.) return unvalidated
  handles; a bad path surfaces via the `getValueAsync()` rejection or the
  `useRive*` hooks' `error` result instead of an `undefined` return.
- `updateReferencedAssets` (runtime asset swapping) is not supported.

## Android render backend (new runtime only)

The new Android runtime renders with OpenGL by default. Vulkan can
be opted into per process:

```ts
import { RiveRuntime } from '@rive-app/react-native';

RiveRuntime.setAndroidRenderBackend('vulkan');
```

Call it before loading any Rive files — the choice is fixed once the shared
render worker is created (a later call logs a warning and is ignored).
Vulkan requires Android 10 (API 29) or newer; rive-android automatically
falls back to OpenGL when Vulkan is unavailable or fails to initialize. The
call is a no-op on iOS and on the legacy Android backend.
