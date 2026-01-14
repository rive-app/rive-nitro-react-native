// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { getConfig } = require('react-native-builder-bob/metro-config');
const path = require('path');
const root = path.resolve(__dirname, '..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
config.resolver.assetExts = [...config.resolver.assetExts, 'riv'];

const finalConfig = getConfig(config, {
  root,
  project: __dirname,
});

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

// Force all react-native imports to resolve to expo-example's node_modules
// This fixes duplicate module instances when library code imports react-native
const rnPath = path.join(__dirname, 'node_modules/react-native/index.js');
const originalResolveRequest = finalConfig.resolver.resolveRequest;
finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native') {
    return { type: 'sourceFile', filePath: rnPath };
  }

  const customResolution = resolveExampleAliasToSourceDir(
    context,
    moduleName,
    root
  );

  if (customResolution) {
    return customResolution;
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = finalConfig;
