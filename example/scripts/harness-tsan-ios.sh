#!/usr/bin/env bash
# Run the harness with Thread Sanitizer.
#
# The harness only drives a prebuilt app, so TSan (a compile flag) has to be baked into
# the app here. This is the normal example build (same xcodebuild as `yarn build:ios`
# and CI) plus `-enableThreadSanitizer YES`, then install + run the harness against the
# booted simulator.
#
# Requires a booted simulator (open -a Simulator, or `yarn ios` once). The booted device
# is auto-targeted; override with DEVICE_MODEL / IOS_VERSION. Extra args are forwarded to
# the harness, e.g.:  yarn test:harness:ios:tsan --testPathPattern issue297
# TSan reports are written to /tmp/tsan_harness.<pid> (see rn-harness.config.mjs).
set -euo pipefail
cd "$(dirname "$0")/.."

BOOTED=$(xcrun simctl list devices booted -j)
if ! echo "$BOOTED" | grep -q '"state" : "Booted"'; then
  echo "No booted simulator. Boot one (open -a Simulator) or run 'yarn ios' first." >&2
  exit 1
fi

# Point the harness at the booted device unless the caller pinned one.
if [ -z "${DEVICE_MODEL:-}" ] || [ -z "${IOS_VERSION:-}" ]; then
  eval "$(echo "$BOOTED" | node -e '
    const d = JSON.parse(require("fs").readFileSync(0, "utf8"));
    for (const [rt, list] of Object.entries(d.devices)) {
      const dev = (list || []).find((x) => x.state === "Booted");
      const m = rt.match(/iOS-(\d+)-(\d+)/);
      if (dev && m) {
        console.log(`DEVICE_MODEL=${JSON.stringify(dev.name)}`);
        console.log(`IOS_VERSION=${m[1]}.${m[2]}`);
        break;
      }
    }')"
  export DEVICE_MODEL IOS_VERSION
fi
echo "Targeting $DEVICE_MODEL ($IOS_VERSION)"

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
