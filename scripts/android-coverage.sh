#!/bin/bash
set -euo pipefail

APP_ID="${1:-rive.example}"
REPO_ROOT=$(git rev-parse --show-toplevel)
JACOCO_VERSION="${JACOCO_VERSION:-0.8.12}"
JACOCO_CLI="$REPO_ROOT/.jacoco/jacococli.jar"

# Download JaCoCo CLI if not cached
if [ ! -f "$JACOCO_CLI" ]; then
  echo "Downloading JaCoCo CLI $JACOCO_VERSION..."
  mkdir -p "$REPO_ROOT/.jacoco"
  curl -sL "https://github.com/jacoco/jacoco/releases/download/v${JACOCO_VERSION}/jacoco-${JACOCO_VERSION}.zip" \
    -o /tmp/jacoco.zip
  unzip -oq /tmp/jacoco.zip "lib/jacococli.jar" -d /tmp/jacoco
  mv /tmp/jacoco/lib/jacococli.jar "$JACOCO_CLI"
  rm -rf /tmp/jacoco /tmp/jacoco.zip
fi

# Force-stop the app to trigger activity lifecycle flush, then wait for data
adb shell am force-stop "$APP_ID" 2>/dev/null || true
sleep 2

# Pull all .ec files from the app's internal storage
EC_DIR="$REPO_ROOT/.jacoco/ec"
rm -rf "$EC_DIR"
mkdir -p "$EC_DIR"

# Use tar to reliably pull all .ec files (avoids adb shell + pipe issues)
adb shell run-as "$APP_ID" sh -c "'cd files && tar cf - *.ec 2>/dev/null'" | tar xf - -C "$EC_DIR" 2>/dev/null || true

EC_COUNT=$(find "$EC_DIR" -name "*.ec" 2>/dev/null | wc -l | tr -d ' ')
[ "$EC_COUNT" -gt 0 ] || { echo "No .ec files found in $APP_ID internal storage"; exit 1; }
echo "Found $EC_COUNT .ec file(s)"

# Merge .ec files
MERGED_EC="$REPO_ROOT/.jacoco/merged.ec"
java -jar "$JACOCO_CLI" merge "$EC_DIR"/*.ec --destfile "$MERGED_EC"

# Use the original (uninstrumented) class files saved during the build
LIB_CLASSES="$REPO_ROOT/android/build/jacoco-original-classes"
if [ ! -d "$LIB_CLASSES" ]; then
  echo "Original class files not found at $LIB_CLASSES"
  echo "Was the library built with -PRive_KotlinCoverage=true?"
  exit 1
fi
echo "Using class files: $LIB_CLASSES"

LIB_SOURCES="$REPO_ROOT/android/src/main/java"

# Generate XML report
java -jar "$JACOCO_CLI" report "$MERGED_EC" \
  --classfiles "$LIB_CLASSES" \
  --sourcefiles "$LIB_SOURCES" \
  --xml "$REPO_ROOT/coverage-kotlin.xml"

# Generate CSV for quick summary
java -jar "$JACOCO_CLI" report "$MERGED_EC" \
  --classfiles "$LIB_CLASSES" \
  --sourcefiles "$LIB_SOURCES" \
  --csv "$REPO_ROOT/coverage-kotlin.csv"

# Generate HTML report
java -jar "$JACOCO_CLI" report "$MERGED_EC" \
  --classfiles "$LIB_CLASSES" \
  --sourcefiles "$LIB_SOURCES" \
  --html "$REPO_ROOT/coverage-kotlin-html"

# Print summary from CSV
echo ""
echo "=== Kotlin Coverage Summary ==="
if [ -f "$REPO_ROOT/coverage-kotlin.csv" ]; then
  # CSV columns: GROUP,PACKAGE,CLASS,INSTRUCTION_MISSED,INSTRUCTION_COVERED,...,LINE_MISSED,LINE_COVERED,...
  tail -n +2 "$REPO_ROOT/coverage-kotlin.csv" | awk -F',' '
    { line_missed += $8; line_covered += $9 }
    END {
      total = line_missed + line_covered
      if (total > 0) printf "Lines: %d/%d (%.1f%%)\n", line_covered, total, line_covered * 100.0 / total
      else print "No coverage data"
    }
  '
fi

echo ""
echo "→ coverage-kotlin.xml"
echo "→ coverage-kotlin-html/index.html"
