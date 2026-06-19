#!/usr/bin/env bash
# Run the harness with Thread Sanitizer.
#
# The harness only drives a prebuilt app, so TSan (a compile flag) has to be baked into
# the app here. This is the normal example build (same xcodebuild as `yarn build:ios`
# and CI) plus `-enableThreadSanitizer YES`, then install + run the harness. The harness
# targets the booted simulator automatically (see rn-harness.config.mjs).
#
# Requires a booted simulator (open -a Simulator, or `yarn ios` once). Extra args are
# forwarded to the harness, e.g.:  yarn test:harness:ios:tsan --testPathPattern issue297
# TSan reports are written to /tmp/tsan_harness.<pid>.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! xcrun simctl list devices booted | grep -q Booted; then
  echo "No booted simulator. Boot one (open -a Simulator) or run 'yarn ios' first." >&2
  exit 1
fi

APP="ios/build/Build/Products/Debug-iphonesimulator/RiveExample.app"

echo "Building RiveExample with Thread Sanitizer..."
( cd ios && xcodebuild \
  -derivedDataPath build \
  -workspace RiveExample.xcworkspace \
  -scheme RiveExample \
  -sdk iphonesimulator \
  -configuration Debug \
  -enableThreadSanitizer YES \
  build \
  CODE_SIGNING_ALLOWED=NO )

xcrun simctl install booted "$APP"

HARNESS_APP_PATH="$PWD/$APP" yarn test:harness:ios "$@"
