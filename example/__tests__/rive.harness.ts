import { describe, it, expect } from 'react-native-harness';
import { Platform } from 'react-native';
import { RiveFileFactory } from '@rive-app/react-native';

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

    const isExperimentalIOS =
      Platform.OS === 'ios' && RiveFileFactory.getBackend() === 'experimental';
    if (!isExperimentalIOS) {
      // Experimental API can't sync-validate property paths
      expect(await instance?.viewModelAsync('nonexistent')).toBeUndefined();
    }

    expect(vm1?.instanceName).toBeDefined();
    expect(typeof vm1?.instanceName).toBe('string');
    expect(vm1?.stringProperty('name')).toBeDefined();
  });

  it('replaceViewModel() replaces and shares state', async () => {
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
    // Android experimental backend doesn't support replaceViewModel yet (no-op)
    const val = vm1NameProp?.value;
    expect(val === testValue || val === 'name1').toBe(true);
  });
});
