const path = require('path');

/**
 * Forces all react-native imports to resolve to a single instance from the project's node_modules.
 * This fixes duplicate module instances in monorepo setups where the library has its own react-native.
 *
 * @param {import('metro-config').MetroConfig} config - Metro configuration
 * @param {string} projectDir - Directory containing node_modules with react-native
 * @returns {import('metro-config').MetroConfig}
 */
function withSingleReactNative(config, projectDir) {
  const rnPath = path.join(projectDir, 'node_modules/react-native/index.js');
  const originalResolveRequest = config.resolver.resolveRequest;
  return {
    ...config,
    resolver: {
      ...config.resolver,
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName === 'react-native') {
          return { type: 'sourceFile', filePath: rnPath };
        }
        return originalResolveRequest
          ? originalResolveRequest(context, moduleName, platform)
          : context.resolveRequest(context, moduleName, platform);
      },
    },
  };
}

module.exports = { withSingleReactNative };
