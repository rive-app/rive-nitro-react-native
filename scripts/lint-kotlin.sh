#!/bin/bash
set -e

KTLINT_VERSION="1.5.0"
KTLINT_DIR=".ktlint"
KTLINT_BIN="$KTLINT_DIR/ktlint"

if [ ! -f "$KTLINT_BIN" ]; then
  echo "Downloading ktlint $KTLINT_VERSION..."
  mkdir -p "$KTLINT_DIR"
  curl -sSL "https://github.com/pinterest/ktlint/releases/download/${KTLINT_VERSION}/ktlint" -o "$KTLINT_BIN"
  chmod +x "$KTLINT_BIN"
fi

"$KTLINT_BIN" "android/src/**/*.kt" --reporter=plain
