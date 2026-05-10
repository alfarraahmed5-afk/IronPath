# build-preview.ps1
#
# Helper that runs an EAS preview build for both iOS + Android and
# prints the resulting download URLs so the founder can side-load.
#
# Usage (from repo root or mobile/):
#   pwsh -File mobile/scripts/build-preview.ps1
#   pwsh -File mobile/scripts/build-preview.ps1 -Platform android
#   pwsh -File mobile/scripts/build-preview.ps1 -Platform ios
#
# Prereqs:
#   1. `npm install -g eas-cli` (or use npx eas-cli)
#   2. `eas login` (Expo account with the IronPath project linked)
#   3. eas.json profile "preview" is the source of truth for env + channel.
#
# Notes:
#   - Channel is "preview" (matches eas.json).
#   - Android builds an APK suitable for direct side-load (drag-drop on
#     Pixel 8 dev mode + adb install).
#   - iOS builds an .ipa suitable for TestFlight Internal Testing OR
#     Ad-Hoc side-load if a UDID-provisioned profile exists.
#   - Apple credentials in eas.json:submit.production are placeholders;
#     the founder must populate before `eas submit --profile production`.
#     See FOUNDER_SIDELOAD.md for the action item.

param(
  [ValidateSet("all", "android", "ios")]
  [string]$Platform = "all",
  [switch]$NonInteractive,
  [switch]$NoWait
)

$ErrorActionPreference = "Stop"

# Resolve mobile/ as the working dir regardless of where the script runs.
$mobileDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location $mobileDir

Write-Host ""
Write-Host "=== IronPath EAS preview build ==="
Write-Host "  cwd:      $mobileDir"
Write-Host "  platform: $Platform"
Write-Host "  channel:  preview"
Write-Host ""

# Sanity: eas.json must exist.
if (-not (Test-Path "eas.json")) {
  Write-Error "eas.json not found in $mobileDir. Aborting."
  exit 1
}

# Sanity: eas-cli must be reachable.
$easCmd = Get-Command "eas" -ErrorAction SilentlyContinue
if (-not $easCmd) {
  Write-Host "eas-cli not on PATH; falling back to 'npx eas-cli'."
  $easBin = "npx"
  $easPrefix = @("eas-cli")
} else {
  $easBin = "eas"
  $easPrefix = @()
}

# Compose args.
$args = $easPrefix + @("build", "--profile", "preview", "--platform", $Platform)
if ($NonInteractive) { $args += "--non-interactive" }
if ($NoWait)         { $args += "--no-wait" }

Write-Host "Running: $easBin $($args -join ' ')"
Write-Host ""

# Run EAS. Tee output so the user sees progress + we can grep download URLs.
$logFile = Join-Path $env:TEMP "ironpath-eas-preview-$(Get-Date -Format yyyyMMddHHmmss).log"
& $easBin @args 2>&1 | Tee-Object -FilePath $logFile

if ($LASTEXITCODE -ne 0) {
  Write-Error "EAS build failed. Log: $logFile"
  exit $LASTEXITCODE
}

# Extract download URLs from the EAS output. EAS prints lines like:
#   "Build artifact URL: https://expo.dev/artifacts/..."
#   "Install on device: https://expo.dev/accounts/.../builds/..."
Write-Host ""
Write-Host "=== Download URLs ==="
Select-String -Path $logFile -Pattern "https://expo.dev/[^\s]+" |
  ForEach-Object { Write-Host "  $($_.Line.Trim())" }

Write-Host ""
Write-Host "Build log saved to: $logFile"
Write-Host "Side-load brief:    mobile/docs/FOUNDER_SIDELOAD.md"
Write-Host ""
