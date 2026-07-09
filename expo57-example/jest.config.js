module.exports = {
  preset: 'react-native-harness',
  // Run the bare example's harness suite against this Expo app; the shared
  // metro config redirects those files' imports into this workspace.
  roots: ['<rootDir>', '<rootDir>/../example/src'],
};
