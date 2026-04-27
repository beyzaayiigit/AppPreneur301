module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 eklentisi, worklets eklentisini zaten içerir; ikisini birden yazmak Babel'de "Duplicate plugin" üretir.
    plugins: ['react-native-reanimated/plugin'],
  };
};
