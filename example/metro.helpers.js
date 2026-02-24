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
  const nodeModulesDir = path.join(projectDir, 'node_modules');
  const modulePaths = Object.fromEntries(
    modulesToDeduplicate.map((mod) => [
      mod,
      path.join(nodeModulesDir, mod, 'index.js'),
    ])
  );
  const originalResolveRequest = config.resolver.resolveRequest;
  const defaultResolve = (context, moduleName, platform) =>
    context.resolveRequest(context, moduleName, platform);
  const resolveRequest = originalResolveRequest ?? defaultResolve;

  // Anchor path inside the project's node_modules so that subpath
  // imports (e.g. react-native/Libraries/...) resolve from here.
  const anchorPath = path.join(nodeModulesDir, '_module_anchor');

  return {
    ...config,
    resolver: {
      ...config.resolver,
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName in modulePaths) {
          return { type: 'sourceFile', filePath: modulePaths[moduleName] };
        }
        // Handle subpath imports (e.g. 'react-native/Libraries/...')
        // to ensure they resolve from the project's node_modules.
        for (const mod of modulesToDeduplicate) {
          if (moduleName.startsWith(mod + '/')) {
            return resolveRequest(
              { ...context, originModulePath: anchorPath },
              moduleName,
              platform
            );
          }
        }
        return resolveRequest(context, moduleName, platform);
      },
    },
  };
}

module.exports = { withSingleReactNative };
