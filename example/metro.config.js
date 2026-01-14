const path = require('path');
const { getDefaultConfig } = require('@react-native/metro-config');
const { getConfig } = require('react-native-builder-bob/metro-config');
const { withRnHarness } = require('react-native-harness/metro');

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
const finalConfig = getConfig(config, {
  root,
  project: __dirname,
});

// Force all react-native imports to resolve to example's node_modules
// This fixes duplicate module instances in harness tests
const rnPath = path.join(__dirname, 'node_modules/react-native/index.js');
const originalResolveRequest = finalConfig.resolver.resolveRequest;
finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native') {
    return { type: 'sourceFile', filePath: rnPath };
  }
  return originalResolveRequest(context, moduleName, platform);
};

module.exports = withRnHarness(finalConfig);
