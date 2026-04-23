// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { getConfig } = require('react-native-builder-bob/metro-config');
const path = require('path');
const {
  withSingleReactNative,
  withBlockedSiblingDeps,
} = require('../example/metro.helpers');

const root = path.resolve(__dirname, '..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
config.resolver.assetExts = [...config.resolver.assetExts, 'riv'];

const bobConfig = getConfig(config, {
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

const originalResolveRequest = bobConfig.resolver.resolveRequest;
// Anchor inside expo55-example so imports from shared example/src files
// resolve dependencies from expo55-example/node_modules instead of
// example/node_modules (which is blocked by withBlockedSiblingDeps).
const expo55Anchor = path.join(__dirname, 'node_modules', '_module_anchor');

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
      // When resolving from shared example/ files, redirect to
      // expo55-example's node_modules so blocked sibling deps don't
      // cause "Unable to resolve" errors.
      const exampleDir2 = path.join(root, 'example') + path.sep;
      const isFromExample =
        context.originModulePath &&
        context.originModulePath.startsWith(exampleDir2) &&
        !context.originModulePath.includes('node_modules');
      if (isFromExample) {
        try {
          const redirectedContext = {
            ...context,
            originModulePath: expo55Anchor,
          };
          return context.resolveRequest(
            redirectedContext,
            moduleName,
            platform
          );
        } catch (_) {
          // fallback to default resolution
        }
      }
      return originalResolveRequest
        ? originalResolveRequest(context, moduleName, platform)
        : context.resolveRequest(context, moduleName, platform);
    },
  },
};

const exampleDir = path.resolve(root, 'example');
const expoExampleDir = path.resolve(root, 'expo-example');
module.exports = withSingleReactNative(
  withBlockedSiblingDeps(
    withBlockedSiblingDeps(configWithAlias, __dirname, exampleDir),
    __dirname,
    expoExampleDir
  ),
  __dirname
);
