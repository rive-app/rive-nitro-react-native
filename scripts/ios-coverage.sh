#!/bin/bash
set -euo pipefail

BUNDLE_ID="${1:-rive.example}"
DERIVED_DATA="${2:-example/ios/build}"
REPO_ROOT=$(git rev-parse --show-toplevel)
ARCH="${3:-arm64}"

# Background the app to trigger didEnterBackground flush, then terminate for SIGTERM flush
xcrun simctl launch booted com.apple.Preferences 2>/dev/null || true
sleep 1
xcrun simctl terminate booted "$BUNDLE_ID" 2>/dev/null || true
sleep 1

APP_CONTAINER=$(xcrun simctl get_app_container booted "$BUNDLE_ID" data)
DOCS_DIR="$APP_CONTAINER/Documents"

# Collect all profraw files (one per process)
PROFRAW_FILES=$(find "$DOCS_DIR" -name "*.profraw" 2>/dev/null)
[ -n "$PROFRAW_FILES" ] || { echo "No profraw files in $DOCS_DIR"; exit 1; }
echo "Found $(echo "$PROFRAW_FILES" | wc -l | tr -d ' ') profraw file(s)"

# Xcode 26+ uses a debug.dylib that contains the actual code and coverage data.
APP_DIR=$(find "$DERIVED_DATA" -name "RiveExample.app" -path "*/Debug-iphonesimulator/*" -type d | head -1)
[ -n "$APP_DIR" ] || { echo "RiveExample.app not found in $DERIVED_DATA"; exit 1; }

if [ -f "$APP_DIR/RiveExample.debug.dylib" ]; then
  BINARY="$APP_DIR/RiveExample.debug.dylib"
else
  BINARY="$APP_DIR/RiveExample"
fi
echo "Using binary: $BINARY (arch: $ARCH)"

# Merge all profraw files into one profdata
# shellcheck disable=SC2086
xcrun llvm-profdata merge -sparse $PROFRAW_FILES -o "$REPO_ROOT/coverage.profdata"

xcrun llvm-cov export "$BINARY" \
  -instr-profile="$REPO_ROOT/coverage.profdata" \
  -format=lcov \
  -arch "$ARCH" \
  -ignore-filename-regex='.*/(Pods|nitrogen|node_modules|DerivedData)/.*' \
  -sources "$REPO_ROOT/ios/" \
  > "$REPO_ROOT/coverage-swift.lcov"

xcrun llvm-cov report "$BINARY" \
  -instr-profile="$REPO_ROOT/coverage.profdata" \
  -arch "$ARCH" \
  -ignore-filename-regex='.*/(Pods|nitrogen|node_modules|DerivedData)/.*' \
  -sources "$REPO_ROOT/ios/"

echo "→ coverage-swift.lcov"
