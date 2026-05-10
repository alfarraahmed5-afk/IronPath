#!/usr/bin/env node
// measure-cold-start.mjs
//
// Documentation + (semi)-automated harness for cold-start measurement.
//
// Lens 6 budget:
//   - Pixel 8 / Galaxy S24:  cold start <= 1800 ms to first interactive frame
//   - iPhone 15 Pro:         cold start <= 1500 ms to first interactive frame
//
// Cold-start measurement on RN apps cannot be fully automated without a
// physical device + adb (Android) or Xcode Instruments (iOS). This file
// is a runbook + a small adb helper for the Android side. iOS is purely
// manual instructions because Instruments has no cleanly scriptable CLI.
//
// Usage:
//   node mobile/scripts/measure-cold-start.mjs --help
//   node mobile/scripts/measure-cold-start.mjs --android --samples 5
//   node mobile/scripts/measure-cold-start.mjs --android --device R3CT902XXXX
//   node mobile/scripts/measure-cold-start.mjs --ios   # prints iOS runbook
//
// Prereqs:
//   - Android: a physical Pixel 8 with USB debugging enabled, the
//     IronPath preview APK installed (`adb install -r app-preview.apk`),
//     and adb on PATH.
//   - iOS: Xcode 16+ on a Mac, the IronPath preview build installed
//     via TestFlight or Ad-Hoc, an iPhone 15 Pro paired.

import { spawn, spawnSync } from "node:child_process";
import { argv, exit } from "node:process";

const PACKAGE_NAME = "com.ironpath.app"; // confirm matches mobile/app.json android.package
const ACTIVITY = ".MainActivity";
const COLD_START_BUDGET_MS = 1800;
const IOS_BUDGET_MS = 1500;

function printHelp() {
  console.log(`
measure-cold-start.mjs - IronPath cold-start runbook + adb harness

Usage:
  node mobile/scripts/measure-cold-start.mjs --help
  node mobile/scripts/measure-cold-start.mjs --android [--samples N] [--device SERIAL]
  node mobile/scripts/measure-cold-start.mjs --ios

Flags:
  --android         Run the Android adb harness on a connected device.
  --ios             Print the iOS runbook (manual; uses Xcode Instruments).
  --samples N       Number of cold-start samples to collect on Android (default: 5).
  --device SERIAL   adb device serial (defaults to the only connected device).
  --help            Show this message.

Targets:
  Android Pixel 8 / Galaxy S24:  <= ${COLD_START_BUDGET_MS} ms
  iPhone 15 Pro:                 <= ${IOS_BUDGET_MS} ms
`);
}

function parseArgs() {
  const args = { android: false, ios: false, samples: 5, device: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") { printHelp(); exit(0); }
    else if (a === "--android") args.android = true;
    else if (a === "--ios") args.ios = true;
    else if (a === "--samples") args.samples = parseInt(argv[++i], 10) || 5;
    else if (a === "--device") args.device = argv[++i];
    else { console.error(`Unknown flag: ${a}`); printHelp(); exit(2); }
  }
  if (!args.android && !args.ios) { printHelp(); exit(0); }
  return args;
}

function adb(args, opts = {}) {
  const all = opts.device ? ["-s", opts.device, ...args] : args;
  return spawnSync("adb", all, { encoding: "utf8", ...opts });
}

function ensureAdb() {
  const out = spawnSync("adb", ["version"], { encoding: "utf8" });
  if (out.status !== 0) {
    console.error("ERROR: adb not on PATH. Install Android platform-tools.");
    exit(1);
  }
}

function ensureDevice(device) {
  const out = adb(["devices"]);
  const lines = out.stdout.split("\n").slice(1).filter(l => l.trim() && !l.startsWith("*"));
  const devices = lines.map(l => l.split(/\s+/)[0]).filter(Boolean);
  if (devices.length === 0) {
    console.error("ERROR: no adb device connected. Connect a Pixel 8 with USB debugging.");
    exit(1);
  }
  if (device && !devices.includes(device)) {
    console.error(`ERROR: device ${device} not connected. Available: ${devices.join(", ")}`);
    exit(1);
  }
  return device || devices[0];
}

function ensureAppInstalled(device) {
  const out = adb(["shell", "pm", "list", "packages", PACKAGE_NAME], { device });
  if (!out.stdout.includes(PACKAGE_NAME)) {
    console.error(`ERROR: ${PACKAGE_NAME} not installed on ${device}.`);
    console.error(`Install the preview APK first:`);
    console.error(`  adb -s ${device} install -r mobile/app-preview.apk`);
    exit(1);
  }
}

function killApp(device) {
  adb(["shell", "am", "force-stop", PACKAGE_NAME], { device });
  // Drop the file system cache so the next start is a true cold start.
  adb(["shell", "echo", "3", ">", "/proc/sys/vm/drop_caches"], { device });
}

function startCold(device) {
  // -W waits for activity to be drawn; -S stops the existing instance.
  // The output includes "TotalTime: NNN" which is the system-perceived
  // time-to-displayed.
  return adb(
    ["shell", "am", "start", "-W", "-S", "-n", `${PACKAGE_NAME}/${ACTIVITY}`],
    { device }
  );
}

function parseTotalTime(stdout) {
  const m = stdout.match(/TotalTime:\s+(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

async function runAndroidHarness({ samples, device }) {
  ensureAdb();
  const dev = ensureDevice(device);
  ensureAppInstalled(dev);
  console.log(`\nMeasuring cold start on device ${dev}, ${samples} samples...\n`);
  console.log(`Budget: ${COLD_START_BUDGET_MS} ms (Lens 6 P0).`);
  console.log(`Target activity: ${PACKAGE_NAME}/${ACTIVITY}\n`);

  const results = [];
  for (let i = 1; i <= samples; i++) {
    process.stdout.write(`Sample ${i}/${samples}: `);
    killApp(dev);
    // Small pause so the system is quiescent.
    await new Promise(r => setTimeout(r, 1500));
    const out = startCold(dev);
    const t = parseTotalTime(out.stdout);
    if (t == null) {
      console.log("FAILED to parse TotalTime; full output:");
      console.log(out.stdout);
      continue;
    }
    results.push(t);
    const verdict = t <= COLD_START_BUDGET_MS ? "PASS" : "FAIL";
    console.log(`${t} ms  [${verdict}]`);
  }

  if (results.length === 0) {
    console.error("\nNo successful samples. Aborting.");
    exit(1);
  }

  const sorted = [...results].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mean = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  console.log("\n=== Summary ===");
  console.log(`  samples: ${results.length}`);
  console.log(`  min:     ${min} ms`);
  console.log(`  median:  ${median} ms`);
  console.log(`  mean:    ${mean} ms`);
  console.log(`  max:     ${max} ms`);
  console.log(`  budget:  ${COLD_START_BUDGET_MS} ms`);
  console.log(`  verdict: ${median <= COLD_START_BUDGET_MS ? "PASS" : "FAIL (regression)"}`);
  console.log("");
  console.log("Notes:");
  console.log("  - 'TotalTime' is the system-perceived time-to-displayed.");
  console.log("  - 'Time-to-interactive' adds RN bridge + first-screen render;");
  console.log("    cross-check against Sentry Performance traces in production.");
  console.log("  - For deeper traces, run:");
  console.log(`      adb logcat | grep TIME_TO_INTERACTIVE`);
  console.log("    once the app instruments timing breadcrumbs (lens 6 P1).");
}

function printIosRunbook() {
  console.log(`
=== iOS cold-start runbook (manual) ===

Tooling: Xcode Instruments time-profiler on iPhone 15 Pro.
Budget:  ${IOS_BUDGET_MS} ms (Lens 6 P0).

Steps:

1. Install the IronPath preview build on the iPhone 15 Pro:
   - Via TestFlight invite (preferred), OR
   - Ad-Hoc install over USB via Xcode > Window > Devices and Simulators
     after dragging the .ipa from the EAS build artifact onto the device.

2. Open Xcode (16+) -> Open Developer Tool -> Instruments.

3. New trace -> "Time Profiler" template -> select iPhone 15 Pro as
   the target device, "IronPath" as the target process.

4. Hit Record. The profiler waits for the process to launch.

5. On the iPhone:
   a. Force-quit IronPath (swipe up in app switcher).
   b. Wait 10 seconds.
   c. Tap the IronPath icon.

6. As soon as the Feed tab is interactive (a tap on a card responds),
   stop the recording in Instruments.

7. Read the timeline:
   - "App launch" event marker = process start.
   - First call into our JavaScript bundle = "[ExpoModulesCore]
     EXAppLifecycleManager" tick.
   - First interactive frame = the first input handler firing on the
     Feed tab (look for the synthesized touch).
   - Cold-start time = (interactive frame timestamp) - (App launch).

8. Sample 5 cold starts. Median must be <= ${IOS_BUDGET_MS} ms.

9. If FAIL, drill into the time profiler call tree:
   - Heaviest stack frames during the first 1500 ms.
   - Common offenders: font load, splash-screen hand-off, _layout.tsx
     synchronous initDB / loadFromStorage, push-token registration
     blocking the first render.
   - Lens 6 P0 cold-start surgery (deferred font load + splash
     timeout + InteractionManager-wrapped push registration) should
     have already shipped. If not, file the regression.

10. Record results in mobile/docs/FOUNDER_SIDELOAD.md "Phase 2 execution log".
`);
}

const args = parseArgs();
if (args.android) await runAndroidHarness(args);
if (args.ios) printIosRunbook();
