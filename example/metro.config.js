const path = require('path');
const { getDefaultConfig } = require('@react-native/metro-config');
const { getConfig } = require('react-native-builder-bob/metro-config');

const root = path.resolve(__dirname, '..');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts = [...config.resolver.assetExts, 'riv'];
config.transformer.unstable_allowRequireContext = true;
/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
module.exports = getConfig(config, {
  root,
  project: __dirname,
});
