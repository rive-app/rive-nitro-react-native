module.exports = {
  preset: 'react-native-harness',
  // Run the bare example's FULL harness suite against this Expo app (both
  // example/__tests__ and example/src/__tests__); the shared metro config
  // redirects those files' imports and assets into this workspace. Scoping
  // this to example/src silently dropped ~20 on-device suites from CI.
  roots: ['<rootDir>', '<rootDir>/../example'],
};
