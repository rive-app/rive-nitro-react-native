/* global __dirname */

const path = require('path');
const { getConfig } = require('react-native-builder-bob/babel-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

module.exports = function (api) {
  api.cache(true);

  const config = getConfig(
    {
      presets: ['babel-preset-expo'],
    },
    { root, pkg }
  );

  // SDK 57's @expo/metro-config computes its transform cache key by loading
  // this config without a filename, and Babel rejects string/RegExp matchers
  // in that case ("Configuration contains string/RegExp pattern, but no
  // filename was passed to Babel"). Replace bob's string `include` with an
  // equivalent function matcher, which Babel accepts without a filename.
  for (const override of config.overrides ?? []) {
    if (typeof override.include === 'string') {
      const prefix = override.include;
      override.include = (filename) =>
        typeof filename === 'string' &&
        (filename === prefix || filename.startsWith(prefix + path.sep));
    }
  }

  return config;
};
