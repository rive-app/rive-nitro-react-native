import { describe, it, expect } from 'react-native-harness';
import { Platform } from 'react-native';
import { RiveFileFactory, RiveImages, RiveLog } from '@rive-app/react-native';

const QUICK_START = require('../assets/rive/quick_start.riv');
const VIEWMODEL = require('../assets/rive/viewmodelproperty.riv');

describe('RiveFile Loading', () => {
  it('fromSource with require() works', async () => {
    const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
    expect(file).toBeDefined();
    expect(file.artboardNames).toContain('health_bar_v01');
  });

  it('fromURL works', async () => {
    const file = await RiveFileFactory.fromURL(
      'https://cdn.rive.app/animations/vehicles.riv',
      undefined
    );
    expect(file).toBeDefined();
    expect(file.artboardNames.length).toBeGreaterThan(0);
  });

  it('fromBytes works', async () => {
    // Load the file first via fromSource, then get the URL and fetch raw bytes
    // Simpler: use fromURL to get a known .riv, then re-load via fromBytes
    const response = await fetch(
      'https://cdn.rive.app/animations/vehicles.riv'
    );
    const bytes = await response.arrayBuffer();
    const file = await RiveFileFactory.fromBytes(bytes, undefined);
    expect(file).toBeDefined();
    expect(file.artboardNames.length).toBeGreaterThan(0);
  });
});

describe('ViewModel', () => {
  it('viewModel() basic functionality', async () => {
    const file = await RiveFileFactory.fromSource(VIEWMODEL, undefined);
    const vm = file.defaultArtboardViewModel();
    expect(vm).toBeDefined();

    const instance = vm?.createDefaultInstance();
    expect(instance).toBeDefined();

    const vm1 = await instance?.viewModelAsync('vm1');
    const vm2 = await instance?.viewModelAsync('vm2');
    expect(vm1).toBeDefined();
    expect(vm2).toBeDefined();

    // Experimental backends don't validate nested VM paths — the SDK returns
    // a handle even for nonexistent paths instead of null.
    const isExperimental = RiveFileFactory.getBackend() === 'experimental';
    if (!isExperimental) {
      expect(await instance?.viewModelAsync('nonexistent')).toBeUndefined();
    }

    expect(vm1?.instanceName).toBeDefined();
    expect(typeof vm1?.instanceName).toBe('string');
    expect(vm1?.stringProperty('name')).toBeDefined();
  });

  it('replaceViewModel() replaces and shares state', async () => {
    // replaceViewModel is a no-op on Android experimental (not yet implemented)
    const isAndroidExperimental =
      Platform.OS === 'android' &&
      RiveFileFactory.getBackend() === 'experimental';
    if (isAndroidExperimental) return;

    const file = await RiveFileFactory.fromSource(VIEWMODEL, undefined);
    const vm = file.defaultArtboardViewModel();
    const instance = vm?.createDefaultInstance();
    expect(instance).toBeDefined();

    const vm2Instance = await instance?.viewModelAsync('vm2');
    expect(vm2Instance).toBeDefined();

    const vm2NameProp = vm2Instance?.stringProperty('name');
    expect(vm2NameProp).toBeDefined();
    const testValue = `test-${Date.now()}`;
    vm2NameProp!.value = testValue;

    instance?.replaceViewModel('vm1', vm2Instance!);

    const vm1AfterReplace = await instance?.viewModelAsync('vm1');
    const vm1NameProp = vm1AfterReplace?.stringProperty('name');
    const val = vm1NameProp?.value;
    expect(val).toBe(testValue);
  });
});

describe('RiveImages', () => {
  it('loadFromURLAsync loads an image', async () => {
    const image = await RiveImages.loadFromURLAsync(
      'https://picsum.photos/id/237/100/100'
    );
    expect(image).toBeDefined();
    expect(image.byteSize).toBeGreaterThan(0);
  });
});

describe('RiveLog.setLogLevel', () => {
  it('setLogLevel does not throw for valid levels', () => {
    expect(() => RiveLog.setLogLevel('debug')).not.toThrow();
    expect(() => RiveLog.setLogLevel('info')).not.toThrow();
    expect(() => RiveLog.setLogLevel('warn')).not.toThrow();
    expect(() => RiveLog.setLogLevel('error')).not.toThrow();
  });
});
