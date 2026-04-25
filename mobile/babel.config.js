// We can't use `nativewind/babel` directly because it delegates to
// `react-native-css-interop/babel`, which hardcodes
// `require("react-native-worklets/plugin")` for reanimated 4 — a package
// we don't have installed (Expo SDK 52 ships with reanimated 3, and we
// don't actually depend on reanimated). Inline the parts of the
// css-interop preset that we need (the babel plugin + JSX import-source
// rewrite) and skip the worklets plugin entirely.
module.exports = api => {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],
    plugins: [
      require('react-native-css-interop/dist/babel-plugin').default,
      [
        '@babel/plugin-transform-react-jsx',
        {
          runtime: 'automatic',
          importSource: 'react-native-css-interop',
        },
      ],
    ],
  };
};
