const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Monorepo setup. The IronPath repo is an npm workspace with admin /
// backend / console / marketing alongside mobile. Metro needs to know
// about that.
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so HMR picks up shared/ changes. Preserve
// Expo's default watchFolders (projectRoot) so doctor's config check
// doesn't flag a missing entry.
config.watchFolders = Array.from(new Set([
  ...(config.watchFolders ?? []),
  workspaceRoot,
  projectRoot,
]));

// Resolve modules from mobile FIRST, then root. nodeModulesPaths is
// walked AFTER hierarchical lookup, so this acts as a fallback for
// any workspace-hoisted package.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
