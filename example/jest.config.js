module.exports = {
  preset: 'react-native-harness',
  collectCoverageFrom: [
    '../src/**/*.{ts,tsx}',
    '!../src/**/*.nitro.ts',
    '!../src/**/__tests__/**',
  ],
};
