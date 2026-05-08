# Integrating Native iOS Code Coverage

This guide integrates `@react-native-harness/coverage-ios` into the rive-nitro-react-native example app
to collect native (Swift/ObjC) code coverage from `RNRive` and `RiveRuntime` pods.

## Prerequisites

- Xcode with `xcrun llvm-profdata` and `xcrun llvm-cov` available
- iOS simulator booted (the harness test runner handles this)
- The harness fork with coverage support: `mfazekas/react-native-harness` branch `feat/native-ios-coverage`

## Issues Found During Integration (round 1)

We attempted a full end-to-end integration. The native coverage **pipeline works** — profraw
files are generated, merged, and lcov reports are produced — but several issues in the
`@react-native-harness/coverage-ios` package prevented it from working out of the box.

All issues below have been addressed in the fork (`mfazekas/react-native-harness` branch
`feat/native-ios-coverage`, commit `c709d70`). Remove any manual Podfile workarounds before
retesting.

### Issue 1: Podspec fails to load — `Pod::Spec.new` must be the last expression -- FIXED

`require_relative 'scripts/harness_coverage_hook'` was after the `Pod::Spec.new` block.
CocoaPods expects the last expression to return the spec object. Also `Pod::Installer` is
undefined during podspec parsing (only `cocoapods-core` is loaded).

**Fix:** Moved `require_relative` before `Pod::Spec.new` with `if defined?(Pod::Installer)` guard.

### Issue 2: `install_modules_dependencies` not always available -- FIXED

Defined in React Native's `react_native_pods.rb`, not loaded during podspec parsing.

**Fix:** Guarded with `if defined?(install_modules_dependencies)`, falls back to `s.dependency "React-Core"`.

### Issue 3: `resolve-coverage-pods.mjs` returns empty — config schema mismatch -- FIXED

The script used `@react-native-harness/config`'s `getConfig()` which validates via Zod.
The published npm version doesn't have `native.ios.pods` in its schema, so Zod stripped it.

**Fix:** Rewrote `resolve-coverage-pods.mjs` to read the config file directly (find + dynamic
import). No longer depends on `@react-native-harness/config` at all — works with any published
version.

### Issue 4: Swift class name mangling — `NSClassFromString` fails -- FIXED

The Swift class `HarnessCoverageHelper` got a mangled ObjC name like
`_TtC15HarnessCoverage21HarnessCoverageHelper`.

**Fix:** Added `@objc(HarnessCoverageHelper)` annotation to the class.

### Issue 5: `+load` timing with debug dylibs — `NSClassFromString` returns nil -- FIXED

With Xcode 16+ debug dylibs (mergeable libraries), the Swift class may not be registered
at `+load` time.

**Fix:** Deferred class lookup to `dispatch_async(dispatch_get_main_queue(), ...)`.

### Issue 6: `-force_load` required for HarnessCoverage static library -- FIXED

The `-ObjC` linker flag wasn't pulling HarnessCoverage object files into the final binary
(Xcode 16+ debug dylib linking strategy).

**Fix:** The coverage hook now patches `Pods-*.xcconfig` files to add
`-force_load "${PODS_CONFIGURATION_BUILD_DIR}/HarnessCoverage/libHarnessCoverage.a"`.

### Issue 7: `-fprofile-instr-generate` linker flag missing from app xcconfig -- FIXED

The hook only added `-fprofile-instr-generate` to pod targets, but the app target needs it
too for `__llvm_profile_write_file` and `__llvm_profile_set_filename` symbols.

**Fix:** The coverage hook now also injects `-fprofile-instr-generate` into `Pods-*.xcconfig` files.

### Issue 8: End-to-end integration requires ALL harness packages from the fork -- NOT YET FIXED

The `collectNativeCoverage` integration spans multiple packages:
- `@react-native-harness/config` — schema with `coverage.native.ios.pods`
- `@react-native-harness/platforms` — `collectNativeCoverage` type on runner interface
- `@react-native-harness/platform-apple` — implements `collectNativeCoverage`
- `@react-native-harness/jest` — calls `collectNativeCoverage` in `disposeOnce()`

Only installing `@react-native-harness/coverage-ios` from the fork is not enough. All four
packages above need to come from the fork for the harness to actually call the collector
after tests complete. This resolves when the PR merges and packages are published.

**Workaround for testing:** The pod install side (issues 1-7) is now self-contained in
`coverage-ios`. Profraw files will be generated and flushed by the app. The automatic
collection after tests (merge + lcov export) won't happen until issue 8 is resolved, but
you can collect manually — see Troubleshooting section.

## What Works (verified manually, round 1)

1. Coverage compiler flags (`-profile-generate`, `-fprofile-instr-generate`) are applied to
   RNRive and RiveRuntime pod targets
2. `HARNESS_COVERAGE` compilation condition enables the coverage helper code
3. `HarnessCoverageHelper.setup()` runs at app launch, sets profraw output path, starts
   flush timer
4. `.profraw` files (7-13MB) are written to the app's Documents directory
5. `xcrun llvm-profdata merge` merges profraw files successfully
6. `xcrun llvm-cov export --format=lcov` produces valid lcov data (44K+ lines)
7. Coverage report shows all 37 RNRive Swift/ObjC source files with line-level data
8. The `coverage-collector.ts` in the fork handles Xcode 16+ `debug.dylib` binaries correctly

## Round 2 Results (2026-05-08)

Issues 1–7 fixes verified — all working with no manual Podfile workarounds:

- `pod install` automatically instruments RNRive + RiveRuntime, patches xcconfigs
- Clean build succeeds (Xcode 16.4, ~260s)
- Binary contains `HarnessCoverageHelper`, `HarnessCoverageSetup` symbols (in `.debug.dylib`)
- Manual app launch produces profraw files immediately (verified via simulator logs:
  `[HarnessCoverage] +load called, HARNESS_COVERAGE is defined` and
  `[HarnessCoverage] Found HarnessCoverageHelper, calling setup`)
- 105 harness tests pass (11 suites), JS coverage at 80.23%

**Remaining blocker — Issue 9: profraw files lost between app restarts -- FIXED**

The harness reinstalls the app for each test file, wiping the app's Documents directory.
After a full test run (11 suites), no profraw files remain.

**Fix (commit `f15a893`):** Profraw files now write to `/tmp/harness-coverage/` instead of
the app's Documents directory. On iOS simulators, `/tmp` maps to the simulator's filesystem
(`~/Library/Developer/CoreSimulator/Devices/<UDID>/data/tmp/`) which persists across app
reinstalls. The collector reads from this directory, and it's cleaned at test run start
(to avoid stale data) and after successful collection.

Changes:
- `HarnessCoverageHelper.swift` — writes to `/tmp/harness-coverage/harness-<PID>.profraw`
- `coverage-collector.ts` — reads from `/tmp/harness-coverage/`, cleans after collection
- `instance.ts` — calls `cleanProfrawDir()` at platform init when coverage is configured

## Round 3 Results (2026-05-08) — Native Coverage Working End-to-End

After issue 9 fix (`/tmp/harness-coverage/`), the full pipeline works:

1. `pod install` auto-instruments RNRive + RiveRuntime, patches xcconfigs — no Podfile workarounds
2. Clean build succeeds (Xcode 16.4)
3. 105 harness tests pass (11 suites), JS coverage at 80.23%
4. **11 profraw files** generated in `/tmp/harness-coverage/` — one per test suite, all survive app restarts
5. `llvm-profdata merge` + `llvm-cov report` produces real per-file native coverage

**Native iOS coverage: 26.91% line coverage across 37 RNRive source files**

Notable file coverage:
- `HybridViewModel.swift` — 81% lines
- `HybridViewModelNumberProperty.swift` — 80%
- `RiveReactNativeView.swift` — 76%
- `HybridViewModelTriggerProperty.swift` — 75%
- `HybridViewModelStringProperty.swift` — 74%
- `HybridViewModelInstance.swift` — 73%
- `HybridRiveFile.swift` — 62%
- `HybridRiveView.swift` — 52%

**Important:** The coverage-instrumented app must be pre-installed on the correct simulator
(matching the harness config's `device` — e.g. `iPhone 16 Pro` iOS 18.6). The harness doesn't
build the app itself; it starts whatever is already installed. Steps:
```bash
# Build with coverage
DEVELOPER_DIR=/Applications/Xcode16.4.app/Contents/Developer xcodebuild build \
  -workspace ios/RiveExample.xcworkspace -scheme RiveExample \
  -sdk iphonesimulator -destination "platform=iOS Simulator,name=iPhone 16 Pro,OS=18.6" \
  -derivedDataPath ios/build

# Install on the correct simulator
xcrun simctl install "iPhone 16 Pro" ios/build/Build/Products/Debug-iphonesimulator/RiveExample.app

# Run tests
yarn test:harness:ios:coverage
```

**Remaining gap (issue 8):** The automatic `collectNativeCoverage` call (merge + lcov export)
after tests requires the fork's `platform-apple` and `jest` packages. Until those are published,
collect manually:
```bash
xcrun llvm-profdata merge -sparse /tmp/harness-coverage/*.profraw -o coverage/native-ios.profdata
xcrun llvm-cov export --format=lcov \
  --instr-profile=coverage/native-ios.profdata \
  ios/build/Build/Products/Debug-iphonesimulator/RiveExample.app/RiveExample.debug.dylib \
  > coverage/native-ios.lcov
```

## Steps

### 1. Point harness dependencies to the coverage fork

In the **root** `package.json`, add a `pnpm.overrides` (or `resolutions` for yarn) block to
redirect all harness packages to the fork. Alternatively, if you use npm/yarn workspaces,
use `file:` or `git:` references.

The simplest approach for local testing: link the harness monorepo.

From the harness repo (`/Users/boga/Work/Margelo/react-native-harness`):

```bash
# Build the coverage-ios package
cd packages/coverage-ios
pnpm build  # or: pnpm exec tsc -p tsconfig.lib.json
```

### 2. Add the coverage-ios dependency

In `example/package.json`, add to `devDependencies`:

```json
"@react-native-harness/coverage-ios": "file:/Users/boga/Work/Margelo/react-native-harness/packages/coverage-ios"
```

Then install:

```bash
cd example
pnpm install   # or npm/yarn install
```

### 3. Update the harness config

Edit `example/rn-harness.config.mjs` to add coverage configuration:

```js
import { androidPlatform, androidEmulator } from '@react-native-harness/platform-android';
import { applePlatform, appleSimulator } from '@react-native-harness/platform-apple';

const deviceModel = process.env.DEVICE_MODEL || 'iPhone 16 Pro';
const iosVersion = process.env.IOS_VERSION || '18.6';

export default {
  entryPoint: './index.js',
  appRegistryComponentName: 'RiveExample',
  bridgeTimeout: 90000,
  maxAppRestarts: 3,
  forwardClientLogs: true,
  runners: [
    androidPlatform({
      name: 'android',
      device: androidEmulator(process.env.ANDROID_AVD || 'Medium_Phone_API_35'),
      bundleId: 'rive.example',
    }),
    applePlatform({
      name: 'ios',
      device: appleSimulator(deviceModel, iosVersion),
      bundleId: 'rive.example',
    }),
  ],
  defaultRunner: 'ios',

  // Native iOS code coverage
  coverage: {
    native: {
      ios: {
        pods: ['RNRive', 'RiveRuntime'],
      },
    },
  },
};
```

The `pods` array lists which CocoaPods targets get instrumented with
`-profile-generate -profile-coverage-mapping` (Swift) and
`-fprofile-instr-generate -fcoverage-mapping` (C/ObjC).

Start with just `['RNRive']` if you only care about your own code.
Add `'RiveRuntime'` to also cover the upstream Rive SDK.

### 4. Run pod install

The `@react-native-harness/coverage-ios` podspec hooks into CocoaPods via
`Pod::Installer.prepend`. Running pod install will:

- Read the `coverage.native.ios.pods` array from the harness config
- Add coverage compiler flags to those pod targets
- Enable the `HARNESS_COVERAGE` compilation condition on the `HarnessCoverage` pod
- Add `-fprofile-instr-generate` linker flags

```bash
cd example/ios
pod install
```

You should see output like:
```
[HarnessCoverage] Instrumenting pods for native coverage: RNRive, RiveRuntime
[HarnessCoverage]   -> RNRive
[HarnessCoverage]   -> RiveRuntime
```

### 5. Build the app

A **clean build** is required since the compiler flags changed:

```bash
cd example
# Clean previous build artifacts
xcodebuild clean -workspace ios/RiveExample.xcworkspace -scheme RiveExample

# Build (or let the harness do it via HARNESS_APP_PATH)
xcodebuild build-for-testing \
  -workspace ios/RiveExample.xcworkspace \
  -scheme RiveExample \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,name=$DEVICE_MODEL,OS=$IOS_VERSION" \
  -derivedDataPath ios/build
```

Or if you normally let harness build via `HARNESS_APP_PATH`, just make sure
the `.app` is rebuilt after the pod install.

### 6. Run harness tests with coverage

```bash
cd example
pnpm test:harness:ios:coverage
```

When tests finish, the harness will:
1. Send SIGTERM to the app (triggers `.profraw` flush)
2. Wait briefly for filesystem sync
3. Run `xcrun llvm-profdata merge` on the `.profraw` files
4. Run `xcrun llvm-cov export --format=lcov` to produce an `.lcov` file
5. Log: `Native coverage written to <path>`

The `.lcov` file lands in the project root (the `example/` directory).

### 7. View the coverage report

```bash
# Quick summary
lcov --summary coverage/native-ios.lcov

# Generate HTML report
genhtml coverage/native-ios.lcov -o coverage/native-ios-html
open coverage/native-ios-html/index.html
```

## Troubleshooting

**No `.profraw` files generated:**
- Verify `pod install` printed the `[HarnessCoverage] Instrumenting pods` message
- Ensure the app was rebuilt from scratch after `pod install`
- Check that the simulator app actually ran (not just built)
- Check simulator logs: `xcrun simctl spawn booted log show --predicate 'message CONTAINS "HarnessCoverage"' --last 1m`

**`xcrun llvm-cov` fails:**
- The `.profraw` file must match the exact binary that produced it
- A stale build or incremental build can cause mismatches; do a clean build

**Empty coverage for a pod:**
- The pod's source code must actually execute during the test run
- Check that the pod name in the config matches the CocoaPods target name exactly
  (case-sensitive, visible in `Podfile.lock`)

**Xcode 16+ / debug dylibs:**
- The app binary may be a thin stub; the real code is in `RiveExample.debug.dylib`
- The `coverage-collector.ts` in the fork handles this correctly via `findAppExecutable()`
- When checking symbols manually, use `nm` on the `.debug.dylib`, not the main binary
