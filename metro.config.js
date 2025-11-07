const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    assetExts: ['bin', 'txt', 'jpg', 'png', 'ttf', 'flac', 'dsf', 'dff', 'wav', 'mp3', 'aac', 'ogg', 'm4a', 'opus'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
