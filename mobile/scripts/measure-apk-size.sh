#!/usr/bin/env bash
# measure-apk-size.sh
#
# Measures the size of the IronPath EAS preview APK (or AAB) and
# compares against the lens 6 budget.
#
# Usage:
#   ./mobile/scripts/measure-apk-size.sh [path/to/build.apk]
#
# If no path is provided, the script searches the most-recent EAS
# build artifact in the standard locations:
#   - mobile/*.apk (downloaded EAS artifact)
#   - mobile/build/*.apk
#   - mobile/android/app/build/outputs/apk/release/*.apk (local gradle build)
#
# Lens 6 budgets:
#   APK release arm64-v8a:           <= 38 MB
#   APK delta vs pre-overhaul:       <= +5 MB
#   IPA release iPhone 15 Pro:       <= 45 MB
#
# Pre-overhaul baseline is unknown (no historical APK in the repo).
# When a baseline build exists, drop it at mobile/.baseline.apk and
# the script will compare delta automatically.

set -euo pipefail

APK_BUDGET_BYTES=$((38 * 1024 * 1024))           # 38 MB
APK_DELTA_BUDGET_BYTES=$((5 * 1024 * 1024))      # +5 MB
IPA_BUDGET_BYTES=$((45 * 1024 * 1024))           # 45 MB

# Resolve mobile/ as the working dir.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$MOBILE_DIR"

# Find the artifact.
ARTIFACT="${1:-}"
if [ -z "$ARTIFACT" ]; then
  # Search in priority order.
  for candidate in \
    "$MOBILE_DIR"/*.apk \
    "$MOBILE_DIR"/build/*.apk \
    "$MOBILE_DIR"/android/app/build/outputs/apk/release/*.apk \
    "$MOBILE_DIR"/*.aab \
    "$MOBILE_DIR"/*.ipa
  do
    # Glob may not match; skip if literal path is what's left.
    if [ -f "$candidate" ]; then
      ARTIFACT="$candidate"
      break
    fi
  done
fi

if [ -z "$ARTIFACT" ] || [ ! -f "$ARTIFACT" ]; then
  cat <<EOF
ERROR: no build artifact found.

Expected one of:
  mobile/*.apk                                            (downloaded from EAS)
  mobile/build/*.apk
  mobile/android/app/build/outputs/apk/release/*.apk      (local gradle build)
  mobile/*.aab
  mobile/*.ipa

Run an EAS preview build first:
  pwsh -File mobile/scripts/build-preview.ps1
  ./mobile/scripts/build-preview.sh

Then download the resulting artifact and re-run this script with the
path to the .apk file:
  ./mobile/scripts/measure-apk-size.sh path/to/IronPath-preview.apk
EOF
  exit 1
fi

# Cross-platform size in bytes.
if stat -c%s "$ARTIFACT" >/dev/null 2>&1; then
  SIZE=$(stat -c%s "$ARTIFACT")
else
  # macOS / BSD
  SIZE=$(stat -f%z "$ARTIFACT")
fi

# Round to MB.
SIZE_MB=$(awk "BEGIN { printf \"%.2f\", $SIZE / 1024 / 1024 }")

case "$ARTIFACT" in
  *.apk|*.aab) BUDGET=$APK_BUDGET_BYTES; KIND="APK/AAB" ;;
  *.ipa)       BUDGET=$IPA_BUDGET_BYTES; KIND="IPA"     ;;
  *)           BUDGET=$APK_BUDGET_BYTES; KIND="unknown" ;;
esac

BUDGET_MB=$(awk "BEGIN { printf \"%.2f\", $BUDGET / 1024 / 1024 }")

echo ""
echo "=== IronPath build size measurement ==="
echo "  artifact: $ARTIFACT"
echo "  kind:     $KIND"
echo "  size:     $SIZE_MB MB"
echo "  budget:   $BUDGET_MB MB (Lens 6 P0)"

if [ "$SIZE" -le "$BUDGET" ]; then
  echo "  verdict:  PASS"
else
  OVER=$(( SIZE - BUDGET ))
  OVER_MB=$(awk "BEGIN { printf \"%.2f\", $OVER / 1024 / 1024 }")
  echo "  verdict:  FAIL (over by $OVER_MB MB)"
fi

# Compare against baseline if one exists.
BASELINE="$MOBILE_DIR/.baseline.apk"
if [ -f "$BASELINE" ]; then
  if stat -c%s "$BASELINE" >/dev/null 2>&1; then
    BASE_SIZE=$(stat -c%s "$BASELINE")
  else
    BASE_SIZE=$(stat -f%z "$BASELINE")
  fi
  DELTA=$(( SIZE - BASE_SIZE ))
  DELTA_MB=$(awk "BEGIN { printf \"%.2f\", $DELTA / 1024 / 1024 }")
  DELTA_BUDGET_MB=$(awk "BEGIN { printf \"%.2f\", $APK_DELTA_BUDGET_BYTES / 1024 / 1024 }")
  echo ""
  echo "  baseline:        $BASELINE"
  echo "  baseline size:   $(awk "BEGIN { printf \"%.2f\", $BASE_SIZE / 1024 / 1024 }") MB"
  echo "  delta:           $DELTA_MB MB"
  echo "  delta budget:    +$DELTA_BUDGET_MB MB"
  if [ "$DELTA" -le "$APK_DELTA_BUDGET_BYTES" ]; then
    echo "  delta verdict:   PASS"
  else
    echo "  delta verdict:   FAIL (delta over budget)"
  fi
else
  echo ""
  echo "  baseline: NOT FOUND ($BASELINE)"
  echo "  hint:     drop a pre-overhaul preview APK at mobile/.baseline.apk"
  echo "            to enable delta comparison against the +5 MB cap."
fi

echo ""
