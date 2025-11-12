/* global jest */
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
