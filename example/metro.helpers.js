const path = require('path');

const modulesToDeduplicate = ['react', 'react-native'];

/**
 * Forces specified module imports to resolve to a single instance from the project's node_modules.
 * Both the library (root) and example apps have their own react/react-native in node_modules.
 * Without this, Metro may resolve from the library's node_modules, causing duplicate instances.
 *
 * @param {import('metro-config').MetroConfig} config - Metro configuration
 * @param {string} projectDir - Directory containing node_modules
 * @returns {import('metro-config').MetroConfig}
 */
function withSingleReactNative(config, projectDir) {
  const modulePaths = Object.fromEntries(
    modulesToDeduplicate.map((mod) => [
      mod,
      path.join(projectDir, 'node_modules', mod, 'index.js'),
    ])
  );
  const originalResolveRequest = config.resolver.resolveRequest;
  const defaultResolve = (context, moduleName, platform) =>
    context.resolveRequest(context, moduleName, platform);
  const resolveRequest = originalResolveRequest ?? defaultResolve;

  return {
    ...config,
    resolver: {
      ...config.resolver,
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName in modulePaths) {
          return { type: 'sourceFile', filePath: modulePaths[moduleName] };
        }
        return resolveRequest(context, moduleName, platform);
      },
    },
  };
}

module.exports = { withSingleReactNative };
