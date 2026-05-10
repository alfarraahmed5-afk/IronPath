#!/usr/bin/env bash
# build-preview.sh
#
# Helper that runs an EAS preview build for both iOS + Android and
# prints the resulting download URLs so the founder can side-load.
#
# Usage (from repo root or mobile/):
#   ./mobile/scripts/build-preview.sh
#   ./mobile/scripts/build-preview.sh android
#   ./mobile/scripts/build-preview.sh ios
#
# Prereqs:
#   1. npm install -g eas-cli (or use npx eas-cli)
#   2. eas login (Expo account with the IronPath project linked)
#   3. eas.json profile "preview" is the source of truth for env + channel.
#
# Notes:
#   - Channel is "preview" (matches eas.json).
#   - Android builds an APK suitable for direct side-load.
#   - iOS builds an .ipa for TestFlight Internal Testing OR
#     Ad-Hoc side-load if a UDID-provisioned profile exists.
#   - Apple credentials in eas.json:submit.production are placeholders;
#     the founder must populate before `eas submit --profile production`.
#     See mobile/docs/FOUNDER_SIDELOAD.md for the action item.

set -euo pipefail

PLATFORM="${1:-all}"
case "$PLATFORM" in
  all|android|ios) ;;
  *)
    echo "ERROR: platform must be one of: all | android | ios"
    exit 2
    ;;
esac

# Resolve mobile/ as the working dir regardless of where the script runs.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$MOBILE_DIR"

echo ""
echo "=== IronPath EAS preview build ==="
echo "  cwd:      $MOBILE_DIR"
echo "  platform: $PLATFORM"
echo "  channel:  preview"
echo ""

if [ ! -f "eas.json" ]; then
  echo "ERROR: eas.json not found in $MOBILE_DIR"
  exit 1
fi

if command -v eas >/dev/null 2>&1; then
  EAS_CMD=(eas)
else
  echo "eas-cli not on PATH; falling back to 'npx eas-cli'."
  EAS_CMD=(npx eas-cli)
fi

LOG_FILE="$(mktemp -t ironpath-eas-preview.XXXXXX.log)"
echo "Running: ${EAS_CMD[*]} build --profile preview --platform $PLATFORM"
echo ""

set +e
"${EAS_CMD[@]}" build --profile preview --platform "$PLATFORM" 2>&1 | tee "$LOG_FILE"
EXIT_CODE=${PIPESTATUS[0]}
set -e

if [ "$EXIT_CODE" -ne 0 ]; then
  echo "EAS build failed. Log: $LOG_FILE"
  exit "$EXIT_CODE"
fi

echo ""
echo "=== Download URLs ==="
grep -Eo "https://expo\.dev/[^[:space:]]+" "$LOG_FILE" | sed 's/^/  /'

echo ""
echo "Build log saved to: $LOG_FILE"
echo "Side-load brief:    mobile/docs/FOUNDER_SIDELOAD.md"
echo ""
