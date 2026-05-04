// SDK 55 / Reanimated 4 / NativeWind 4 babel config.
// - `babel-preset-expo` handles RN 0.83 + JSX runtime AND auto-includes
//   `react-native-worklets/plugin` for reanimated 4 worklet transforms.
// - `nativewind/babel` (run after the preset) rewrites JSX import source +
//   delegates to react-native-css-interop. In SDK 55 css-interop's plugin
//   internally requires react-native-worklets, which is now installed.
//
// Earlier we hand-rolled this to skip worklets when the project was on
// SDK 52 with reanimated 3. After the SDK 55 upgrade reanimated jumped to
// v4 and the global Toast/Sheet/Pressable animations crashed on launch
// because worklets weren't transformed.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
