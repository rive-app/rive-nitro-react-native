#!/bin/bash
# Collect crash evidence from the emulator after a failed harness attempt.
# Must run inside the android-emulator-runner script: the action kills the
# emulator when that step ends, so later workflow steps cannot reach adb.
#
# Usage: collect-android-crash-logs.sh <attempt-label> <output-dir>
#
# The dedicated crash buffer and an unfiltered main-buffer dump are saved per
# attempt (the main buffer is a ring, so waiting until the last attempt loses
# the earlier ones). With the "final" label it also pulls /data/tombstones —
# that needs `adb root`, which restarts adbd, so it is kept out of the
# per-attempt path to avoid breaking the next harness attempt's connection.
set +e

attempt="${1:?attempt label required}"
out="${2:?output dir required}"
mkdir -p "$out"

echo "=== Collecting crash logs (attempt $attempt) ==="
adb logcat -d -b crash > "$out/attempt-$attempt-crash-buffer.txt" 2>&1
adb logcat -d > "$out/attempt-$attempt-logcat.txt" 2>&1

echo "--- crash buffer ---"
tail -100 "$out/attempt-$attempt-crash-buffer.txt"
echo "--- fatal lines in main buffer ---"
grep -E 'FATAL EXCEPTION|Fatal signal|AndroidRuntime| DEBUG +: | libc +: ' \
  "$out/attempt-$attempt-logcat.txt" | tail -50

# Clear the buffers so the next attempt's dump only contains its own crash.
adb logcat -c -b main,system,crash 2>/dev/null

if [ "$attempt" = "final" ]; then
  if adb root >/dev/null 2>&1; then
    adb wait-for-device
    adb pull /data/tombstones "$out/tombstones" 2>/dev/null \
      || echo "No tombstones to pull"
  else
    echo "adb root unavailable, capturing bugreport instead"
    adb bugreport "$out/bugreport.zip"
  fi
fi

exit 0
