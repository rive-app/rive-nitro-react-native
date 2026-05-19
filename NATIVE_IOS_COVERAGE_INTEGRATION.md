# Native iOS Code Coverage

Native iOS code coverage is integrated via `react-native-harness` 1.2.0+, which includes
`@react-native-harness/coverage-ios` support out of the box.

## Prerequisites

- Xcode with `xcrun llvm-profdata` and `xcrun llvm-cov` available
- iOS simulator booted (the harness test runner handles this)

## Configuration

The harness config (`example/rn-harness.config.mjs`) specifies which CocoaPods targets
get instrumented:

```js
coverage: {
  native: {
    ios: {
      pods: ['RNRive', 'RiveRuntime'],
    },
  },
},
```

The `pods` array lists which CocoaPods targets get instrumented with
`-profile-generate -profile-coverage-mapping` (Swift) and
`-fprofile-instr-generate -fcoverage-mapping` (C/ObjC).

Start with just `['RNRive']` if you only care about your own code.
Add `'RiveRuntime'` to also cover the upstream Rive SDK.

## Running

```bash
cd example

# Pod install will auto-instrument the configured pods
cd ios && pod install && cd ..

# Clean build required after instrumentation changes
xcodebuild clean -workspace ios/RiveExample.xcworkspace -scheme RiveExample
yarn build:ios

# Run tests with coverage
yarn test:harness:ios:coverage
```

When tests finish, the harness merges `.profraw` files and produces an `.lcov` report.

Profraw files are written to `/tmp/harness-coverage/` which persists across app reinstalls
on iOS simulators.

## Viewing Results

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
- Check simulator logs: `xcrun simctl spawn booted log show --predicate 'message CONTAINS "HarnessCoverage"' --last 1m`

**`xcrun llvm-cov` fails:**
- The `.profraw` file must match the exact binary that produced it — do a clean build

**Xcode 16+ / debug dylibs:**
- The app binary may be a thin stub; the real code is in `RiveExample.debug.dylib`
- The coverage collector handles this automatically via `findAppExecutable()`
