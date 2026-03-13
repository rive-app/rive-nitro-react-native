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

/**
 * Blocks a sibling workspace's node_modules for any dependencies shared between the two.
 * Prevents duplicate native module registration when builder-bob watches the monorepo root.
 *
 * @param {import('metro-config').MetroConfig} config - Metro configuration
 * @param {string} projectDir - This project's directory
 * @param {string} siblingDir - The sibling workspace's directory
 * @returns {import('metro-config').MetroConfig}
 */
function withBlockedSiblingDeps(config, projectDir, siblingDir) {
  const myPkg = require(path.resolve(projectDir, 'package.json'));
  const siblingPkg = require(path.resolve(siblingDir, 'package.json'));

  const myDeps = new Set([
    ...Object.keys(myPkg.dependencies || {}),
    ...Object.keys(myPkg.devDependencies || {}),
  ]);
  const siblingDeps = [
    ...Object.keys(siblingPkg.dependencies || {}),
    ...Object.keys(siblingPkg.devDependencies || {}),
  ];

  const shared = siblingDeps.filter((dep) => myDeps.has(dep));
  if (shared.length === 0) return config;

  const patterns = shared.map((dep) => {
    const escaped = path
      .resolve(siblingDir, 'node_modules', dep)
      .replace(/[/\\]/g, '[/\\\\]');
    return new RegExp(escaped + '[/\\\\].*$');
  });

  const existing = config.resolver?.blockList;
  const blockList = [
    ...(existing ? (Array.isArray(existing) ? existing : [existing]) : []),
    ...patterns,
  ];

  return {
    ...config,
    resolver: {
      ...config.resolver,
      blockList,
    },
  };
}

module.exports = { withSingleReactNative, withBlockedSiblingDeps };
