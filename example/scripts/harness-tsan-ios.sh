#!/usr/bin/env bash
# Build the example app with Thread Sanitizer, install it on the target simulator, then
# run the harness against it. The harness only drives a prebuilt app, so TSan (a compile
# flag) has to be baked into the app here rather than passed to the harness.
#
# Simulator selection: $SIM_UDID, else the booted iPhone simulator.
# Extra args are forwarded to the harness, e.g.:
#   yarn test:harness:ios:tsan --testPathPattern issue297
# TSan reports are written to /tmp/tsan_harness.<pid> (see rn-harness.config.mjs).
set -euo pipefail
cd "$(dirname "$0")/.."

UDID="${SIM_UDID:-$(xcrun simctl list devices booted | grep -m1 -oE '[0-9A-Fa-f-]{36}' || true)}"
if [ -z "$UDID" ]; then
  echo "No booted iPhone simulator found. Boot one (open -a Simulator) or set SIM_UDID." >&2
  exit 1
fi

APP="$PWD/ios/build/Build/Products/Debug-iphonesimulator/RiveExample.app"

echo "Building RiveExample with Thread Sanitizer for simulator $UDID..."
xcodebuild -workspace ios/RiveExample.xcworkspace -scheme RiveExample \
  -configuration Debug -destination "id=$UDID" \
  -enableThreadSanitizer YES -derivedDataPath ios/build CODE_SIGNING_ALLOWED=NO build

xcrun simctl install "$UDID" "$APP"

HARNESS_TSAN=1 HARNESS_APP_PATH="$APP" yarn test:harness:ios "$@"
