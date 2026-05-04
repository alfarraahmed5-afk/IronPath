const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Monorepo setup. The IronPath repo has admin/ and backend/ workspaces that
// pull in older React 18 — those get hoisted to <root>/node_modules and
// poison the mobile bundle (React 19 vs 18 mismatch crashes the
// production export with cryptic 'Unknown error' from Metro).
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the entire monorepo so HMR picks up shared/ changes.
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from mobile FIRST, then root. nodeModulesPaths is
//    walked AFTER hierarchical lookup, so this acts as a fallback for
//    workspace-hoisted packages like react-native + expo-modules-core
//    that aren't installed inside mobile/.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force a single canonical React/React-DOM/Scheduler resolved from the
//    mobile workspace, so the admin workspace's React 18 (hoisted to root)
//    can never poison Metro's module map. We DON'T pin react-native here —
//    it lives at root and isn't duplicated.
config.resolver.extraNodeModules = new Proxy(
  {
    react: path.resolve(projectRoot, 'node_modules/react'),
    'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
    scheduler: path.resolve(projectRoot, 'node_modules/scheduler'),
  },
  {
    // Fall through to default resolution for everything else.
    get: (target, name) => {
      if (name in target) return target[name];
      return path.join(workspaceRoot, 'node_modules', String(name));
    },
  }
);

module.exports = withNativeWind(config, { input: './global.css' });
