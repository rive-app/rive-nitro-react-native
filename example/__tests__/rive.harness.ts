/**
 * Harness tests for Rive - runs on real devices via react-native-harness.
 * Unlike the in-app test runner, the harness cannot use require() asset IDs
 * because Image.resolveAssetSource() doesn't work in this context. We load
 * files directly and run tests inline instead of using the shared test suites.
 */
import { describe, it, beforeAll, expect } from 'react-native-harness';
import { RiveFileFactory } from '@rive-app/react-native';
import type { RiveFile } from '@rive-app/react-native';

const ASSET_URL =
  'http://localhost:8081/assets/assets/rive/viewmodelproperty.riv';

describe('ViewModel', () => {
  let file: RiveFile;

  beforeAll(async () => {
    file = await RiveFileFactory.fromURL(ASSET_URL, undefined);
  });

  it('viewModel() basic functionality', async () => {
    const vm = file.defaultArtboardViewModel();
    expect(vm).toBeDefined();

    const instance = vm?.createDefaultInstance();
    expect(instance).toBeDefined();

    // Valid paths return instances
    const vm1 = instance?.viewModel('vm1');
    const vm2 = instance?.viewModel('vm2');
    expect(vm1).toBeDefined();
    expect(vm2).toBeDefined();

    // Invalid path returns undefined
    expect(instance?.viewModel('nonexistent')).toBeUndefined();

    // Nested instance has expected properties
    expect(vm1?.instanceName).toBeDefined();
    expect(typeof vm1?.instanceName).toBe('string');
    expect(vm1?.stringProperty('name')).toBeDefined();
  });

  it('replaceViewModel() replaces and shares state', async () => {
    const vm = file.defaultArtboardViewModel();
    const instance = vm?.createDefaultInstance();
    expect(instance).toBeDefined();

    const vm2Instance = instance?.viewModel('vm2');
    expect(vm2Instance).toBeDefined();

    // Set a test value on vm2
    const vm2NameProp = vm2Instance?.stringProperty('name');
    expect(vm2NameProp).toBeDefined();
    const testValue = `test-${Date.now()}`;
    vm2NameProp!.value = testValue;

    // Replace vm1 with vm2's instance
    instance?.replaceViewModel('vm1', vm2Instance!);

    // After replacement, vm1 should share vm2's state
    const vm1AfterReplace = instance?.viewModel('vm1');
    const vm1NameProp = vm1AfterReplace?.stringProperty('name');
    expect(vm1NameProp?.value).toBe(testValue);
  });
});
