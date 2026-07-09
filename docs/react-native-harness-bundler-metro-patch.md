# Why we patch `@react-native-harness/bundler-metro`

We carry a yarn patch for `@react-native-harness/bundler-metro@1.4.0-rc.1`
(`.yarn/patches/@react-native-harness-bundler-metro-npm-1.4.0-rc.1-748c6eda8c.patch`,
wired up via `resolutions` in the root `package.json`). Without it, the harness
cannot run against an Expo app: every rendering test fails with
`Render timeout: Element did not mount within 1000ms`, while non-rendering
tests pass. This affects `expo57-example`, which is what all `test-harness-*`
CI jobs run against.

## How the harness takes over the app

react-native-harness works by swapping the app's JS entry module at Metro
resolution time: when a bundle request resolves to the configured `entryPoint`,
the resolver returns `@react-native-harness/runtime/entry-point` instead. The
runtime then registers the app component name (`appRegistryComponentName`) with
its own test-host UI, which contains the `TestComponentOverlay` that `render()`
mounts elements into.

If the swap does not happen, the *real* app boots. The bridge still connects
(it is injected independently, as a Metro polyfill), so tests execute and pure
logic tests pass — but `render()` writes to a store no mounted overlay is
watching, and every rendering test times out. That failure mode is easy to
misread as a store/duplicate-module problem; it is not.

## The bug

`createHarnessEntryPointResolver` (in `dist/resolvers/resolver.js`) only swaps
when **both** of these hold:

1. the resolution originates from the project root (`context.originModulePath`
   equals `process.cwd()`), and
2. the requested module path **textually** matches the resolved `entryPoint`.

Neither holds for an Expo app in a monorepo:

- `@expo/metro-config` sets Metro's *server root* to the monorepo root, so the
  app requests its bundle server-root-relative (e.g.
  `/expo57-example/node_modules/expo-router/entry.bundle`). The entry
  resolution then originates from the **monorepo root**, not the project root,
  and check 1 rejects it.
- Depending on the code path, the app may instead request Expo's virtual entry
  `.expo/.virtual-metro-entry` (the bundle root baked into the generated
  `AppDelegate`). Expo's resolver maps it to the real entry point, but it never
  matches `entryPoint` textually, so check 2 rejects it.

Either way the swap never fires and the real expo-router app boots.

## The patch

Two small changes to `createHarnessEntryPointResolver`:

```diff
         const currentOrigin = path.resolve(context.originModulePath);
-        if (currentOrigin !== rootPath) {
+        // Entry requests originate from the project root, or - in monorepos
+        // where Metro's server root is above the project (e.g. Expo) - from
+        // that ancestor directory.
+        if (currentOrigin !== rootPath && !rootPath.startsWith(currentOrigin + path.sep)) {
             return null;
         }
         const requestedModule = getExtensionlessAbsolutePath(currentOrigin, moduleName);
-        if (requestedModule === expectedEntryPoint) {
+        // Expo apps may also request the virtual entry `.expo/.virtual-metro-entry`,
+        // which Expo's resolver maps to the app's real entry point. It never
+        // matches the configured entryPoint textually, so treat it as the app
+        // entry too.
+        const isExpoVirtualEntry = /[/\\]\.expo[/\\]\.virtual-metro-entry$/.test(requestedModule);
+        if (requestedModule === expectedEntryPoint || isExpoVirtualEntry) {
             return {
                 type: 'sourceFile',
                 filePath: resolvedHarnessPath,
```

The origin check now also accepts ancestors of the project root (the server
root in a monorepo); with that, a server-root-relative request for the real
entry file resolves to the same absolute path as the configured `entryPoint`
and matches. The virtual-entry regex covers the `AppDelegate` bundle-root path.
Non-Expo setups are unaffected: bare apps request their entry from the project
root and never mention `.expo/.virtual-metro-entry`.

## Diagnosing this class of failure

If rendering tests time out while logic tests pass, check *what is actually
registered* before suspecting the store. A throwaway harness test tells you
immediately:

```tsx
import { it, ReactNativeHarness } from 'react-native-harness';
import { AppRegistry } from 'react-native';

it('probe', () => {
  const provided = (AppRegistry as any)
    .getRunnable?.('main')
    ?.componentProvider?.();
  console.log('main is harness UI:', provided === ReactNativeHarness);
});
```

`false` means the entry swap did not happen and the real app is on screen.

## Removal criteria

This belongs upstream in
[react-native-harness](https://github.com/callstackincubator/react-native-harness)
— the package already ships Expo-aware pieces (an Expo manifest middleware,
`transform.routerRoot` bundle params), so Expo apps are an intended target.
Once a release includes an equivalent fix (in `1.4.0` final or later):

1. bump `react-native-harness` and its `@react-native-harness/*` packages,
2. drop the `@react-native-harness/bundler-metro@1.4.0-rc.1` entry from
   `resolutions` in the root `package.json`,
3. delete the patch file, run `yarn install`,
4. verify with `yarn workspace expo57-example test:harness:ios` — all suites
   must pass (if the swap regresses, they fail with render timeouts, see
   above).
