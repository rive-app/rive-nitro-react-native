const path = require('path');

/**
 * Forces all react-native imports to resolve to a single instance from the project's node_modules.
 * Both the library (root) and example apps have their own react-native in node_modules.
 * Without this, Metro may resolve react-native from the library's node_modules, causing duplicate instances.
 *
 * @param {import('metro-config').MetroConfig} config - Metro configuration
 * @param {string} projectDir - Directory containing node_modules with react-native
 * @returns {import('metro-config').MetroConfig}
 */
function withSingleReactNative(config, projectDir) {
  const rnPath = path.join(projectDir, 'node_modules/react-native/index.js');
  const originalResolveRequest = config.resolver.resolveRequest;
  const defaultResolve = (context, moduleName, platform) =>
    context.resolveRequest(context, moduleName, platform);
  const resolveRequest = originalResolveRequest ?? defaultResolve;

  return {
    ...config,
    resolver: {
      ...config.resolver,
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName === 'react-native') {
          return { type: 'sourceFile', filePath: rnPath };
        }
        return resolveRequest(context, moduleName, platform);
      },
    },
  };
}

module.exports = { withSingleReactNative };
