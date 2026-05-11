#!/usr/bin/env node
/**
 * Ensures `react-native` is available at the workspace ROOT
 * `node_modules/react-native/` for nativewind's nested
 * `react-native-css-interop` to resolve via require().
 *
 * Background:
 *   The repo has a root-level overrides block pinning
 *   `react@18.3.1` (needed by marketing + admin + console). Mobile
 *   pins `react@19.2.0`. This version conflict causes npm to keep
 *   `react-native` only inside `mobile/node_modules/react-native/`
 *   instead of hoisting to root.
 *
 *   But `nativewind` IS hoisted to root, and its transitive
 *   `react-native-css-interop` package does
 *   `require('react-native/package.json')` from
 *   `node_modules/nativewind/node_modules/react-native-css-interop/...`.
 *   Walking up from there, it can only find `react-native/` at root
 *   `node_modules/react-native/` -- which is empty under the
 *   workspace install.
 *
 *   Symptom: every `eas build` (and every metro/expo command locally)
 *   fails preflight with:
 *     Cannot find module 'react-native/package.json'
 *     Require stack:
 *     - .../nativewind/node_modules/react-native-css-interop/dist/css-to-rn/feature-flags.js
 *
 * Fix: junction (Windows) / symlink (POSIX) the mobile copy into root.
 *      Falls back to a copy if symlinks are blocked.
 *
 * Idempotent. Safe to re-run. Runs as part of root `postinstall` so
 * every `npm install` / `npm ci` (local + EAS Build CI) self-heals.
 */
const fs = require('fs');
const path = require('path');

const repoRoot   = path.resolve(__dirname, '..');
const rootRn     = path.join(repoRoot, 'node_modules', 'react-native');
const mobileRn   = path.join(repoRoot, 'mobile', 'node_modules', 'react-native');

function pathExists(p) {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

function isUsableRn(p) {
  try {
    const pkg = path.join(p, 'package.json');
    if (!fs.existsSync(pkg)) return false;
    const j = JSON.parse(fs.readFileSync(pkg, 'utf8'));
    return j.name === 'react-native';
  } catch {
    return false;
  }
}

function logSkip(reason) {
  console.log(`[ensure-rn-at-root] skip: ${reason}`);
}

function logFix(strategy) {
  console.log(`[ensure-rn-at-root] linked mobile/node_modules/react-native -> node_modules/react-native (${strategy})`);
}

(function main() {
  if (!pathExists(repoRoot + '/node_modules')) {
    return logSkip('no root node_modules yet -- nothing to do');
  }
  if (isUsableRn(rootRn)) {
    return logSkip('root react-native already present');
  }
  if (!isUsableRn(mobileRn)) {
    return logSkip('mobile/node_modules/react-native missing -- run npm install first');
  }

  // Clean any stale empty dir at the target.
  if (pathExists(rootRn)) {
    try { fs.rmSync(rootRn, { recursive: true, force: true }); } catch {}
  }

  // Try symlink first (fast, no disk duplication). On Windows we need
  // 'junction' to avoid the admin requirement for 'dir' symlinks.
  try {
    const type = process.platform === 'win32' ? 'junction' : 'dir';
    fs.symlinkSync(mobileRn, rootRn, type);
    return logFix(`symlink ${type}`);
  } catch (e) {
    // Fall back to copy if symlinks fail (rare; some sandboxes block them).
    try {
      fs.cpSync(mobileRn, rootRn, { recursive: true });
      return logFix('copy');
    } catch (e2) {
      console.error(`[ensure-rn-at-root] FAILED to mirror react-native: ${e2.message}`);
      // Do NOT throw -- postinstall failure would block every install.
      // The failure surfaces later as the metro.config.js error which is
      // already documented, so the user knows what to do.
    }
  }
})();
