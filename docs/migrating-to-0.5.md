# Migrating to 0.5 (the new Rive runtime)

0.5 switches the library to Rive's new CommandQueue-based runtime
([New Runtime](https://rive.app/docs/runtimes/apple/apple) on iOS,
[New Compose API](https://rive.app/docs/runtimes/android) on Android) and
completes the move to the async JS API. The recommended path:

## 1. On the latest 0.4.x: move to the async APIs

The full async surface already ships in 0.4 — migrate there first, while
everything still behaves exactly as before. Your editor's deprecation
strikethroughs point at each replacement:

| Deprecated                                                                                              | Use instead                                                                           |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `property.value` (read / write)                                                                         | `getValueAsync()` / `set(value)`                                                      |
| `viewModel(path)`                                                                                       | `viewModelAsync(path)`                                                                |
| `createInstanceByName/ByIndex`, `createDefaultInstance`, `createInstance`                               | `createInstanceByNameAsync`, `createDefaultInstanceAsync`, `createBlankInstanceAsync` |
| `viewModelByName/ByIndex`, `defaultArtboardViewModel`                                                   | `viewModelByNameAsync`, `defaultArtboardViewModelAsync`                               |
| list `length`, `getInstanceAt`, `addInstance(At)`, `removeInstance(At)`, `swap`                         | the `*Async` equivalents                                                              |
| `artboardNames`, `artboardCount`, `viewModelCount`, `propertyCount`, `instanceCount`, `getEnums` (sync) | the `*Async` equivalents                                                              |
| `useViewModelInstance(file)` (sync creation)                                                            | `useViewModelInstance(file, { async: true })`                                         |
| state-machine inputs / text runs / Rive events on the view                                              | [data binding](https://rive.app/docs/runtimes/data-binding)                           |

## 2. Try the 0.5 beta

```sh
npm install @rive-app/react-native@next
```

The new runtime is now the default. Things to know:

- Deprecated sync APIs still work, but they block the JS thread and log a
  once-per-member `[Rive/Deprecation]` warning.
- The deprecated state-machine-input, text-run, and Rive-event view methods
  **throw** — data binding replaces them.
- Property accessors (`numberProperty(path)` etc.) return unvalidated
  handles; a typo'd path surfaces via the `getValueAsync()` rejection or the
  `useRive*` hooks' `error` result instead of an `undefined` return.
- `updateReferencedAssets` (runtime asset swapping) is not supported.

## 3. 0.5 stable

Same behavior as the beta: fully migrated apps run warning-free; remaining
deprecated calls keep working with runtime warnings.

## 4. 0.6

Removal of the deprecated APIs is planned for 0.6. Apps that completed
step 1 need no further changes.
