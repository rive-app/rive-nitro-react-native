# Runtime backends (contributor guide)

The library ships two native backends and uses the **experimental** Rive
runtime backend (Rive's CommandQueue-based async API) by default. The
previous implementation is kept as the **legacy** backend **for development
and behavior comparison only** — it is not a supported end-user
configuration and will be removed once the experimental backend has fully
proven out. Select it at build time:

- **iOS** — set the Podfile global before `pod install`:

  ```ruby
  # Podfile (before the target block)
  $UseRiveLegacy = true
  ```

  (`USE_RIVE_LEGACY=1 pod install` also works, but the env var only applies
  to that invocation — any plain `pod install` afterwards silently switches
  the project back to the experimental backend, so prefer the Podfile
  global.)

- **Android** — set the Gradle property, e.g. in `android/gradle.properties`:

  ```properties
  USE_RIVE_LEGACY=true
  ```

You can check which backend is active at runtime via
`RiveFileFactory.getBackend()` (`'experimental' | 'legacy'`).

Behavioral differences on the experimental backend:

- The deprecated state-machine-input, text-run, and Rive-event view methods
  throw — use [data binding](https://rive.app/docs/runtimes/data-binding)
  instead.
- Property accessors (`numberProperty(path)` etc.) return unvalidated
  handles; a bad path surfaces via the `getValueAsync()` rejection or the
  `useRive*` hooks' `error` result instead of an `undefined` return.
- `updateReferencedAssets` (runtime asset swapping) is not supported.
