// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { getConfig } = require('react-native-builder-bob/metro-config');
const path = require('path');
const { withSingleReactNative } = require('../example/metro.helpers');

const root = path.resolve(__dirname, '..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
config.resolver.assetExts = [...config.resolver.assetExts, 'riv'];

const bobConfig = getConfig(config, {
  root,
  project: __dirname,
});

// Block resolution from example/node_modules to avoid version conflicts
// (expo-example uses different reanimated/worklets versions than example app)
const escapeRegex = (str) => str.replace(/[/\\]/g, '[/\\\\]');
const exampleNodeModules = path.join(root, 'example', 'node_modules');
const blockPatterns = [
  new RegExp(
    escapeRegex(path.join(exampleNodeModules, 'react-native-reanimated')) + '.*'
  ),
  new RegExp(
    escapeRegex(path.join(exampleNodeModules, 'react-native-worklets')) + '.*'
  ),
];
const existingBlockList = finalConfig.resolver.blockList;
if (existingBlockList) {
  blockPatterns.push(existingBlockList);
}
finalConfig.resolver.blockList = new RegExp(
  blockPatterns.map((r) => r.source).join('|')
);

/**
 * Resolves @example/* path aliases to the example/src/* directory.
 * Metro doesn't natively understand TypeScript path mappings, so this
 * teaches Metro where to find files imported with the @example/* alias.
 */
function resolveExampleAliasToSourceDir(context, moduleName, projectRoot) {
  if (moduleName.startsWith('@example/')) {
    const relativePath = moduleName.replace('@example/', '');
    const targetPath = path.join(projectRoot, 'example', 'src', relativePath);

    const extensions = ['.tsx', '.ts', '.js', '.jsx'];
    for (const ext of extensions) {
      const fullPath = targetPath.endsWith(ext) ? targetPath : targetPath + ext;
      if (context.doesFileExist(fullPath)) {
        return {
          type: 'sourceFile',
          filePath: fullPath,
        };
      }
    }
  }
  return null;
}

const originalResolveRequest = bobConfig.resolver.resolveRequest;
const configWithAlias = {
  ...bobConfig,
  resolver: {
    ...bobConfig.resolver,
    resolveRequest: (context, moduleName, platform) => {
      const customResolution = resolveExampleAliasToSourceDir(
        context,
        moduleName,
        root
      );
      if (customResolution) {
        return customResolution;
      }
      return originalResolveRequest
        ? originalResolveRequest(context, moduleName, platform)
        : context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = withSingleReactNative(configWithAlias, __dirname);
