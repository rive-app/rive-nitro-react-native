/* global jest, afterEach */
const mockRiveFileFactory = {
  fromURL: jest.fn(),
  fromResource: jest.fn(),
  fromSource: jest.fn(),
  fromBytes: jest.fn(),
};

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => mockRiveFileFactory),
  },
  getHostComponent: jest.fn(() => 'RiveView'),
}));

jest.mock('./nitrogen/generated/shared/json/RiveViewConfig.json', () => ({}), {
  virtual: true,
});

global.mockRiveFileFactory = mockRiveFileFactory;

// Fails any test in which useUnmountEffect's dev canary fired.
const RELEASED_CANARY = 'shown again after its native objects were released';
const originalConsoleError = console.error;
let releasedCanaryHits = [];
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes(RELEASED_CANARY)) {
    releasedCanaryHits.push(args[0]);
  }
  originalConsoleError(...args);
};
afterEach(() => {
  const hits = releasedCanaryHits;
  releasedCanaryHits = [];
  if (hits.length > 0) throw new Error(`Unexpected canary: ${hits[0]}`);
});
