import { RiveFileFactory } from '@rive-app/react-native';
import type { RiveFile } from '@rive-app/react-native';
import { expect } from 'react-native-harness';
import type { TestSuite } from '../types';

const ASSET = require('../../../assets/rive/viewmodelproperty.riv');

export function testViewModelBasicFunctionality(file: RiveFile): void {
  const vm = file.defaultArtboardViewModel();
  expect(vm).toBeDefined();

  const instance = vm?.createDefaultInstance();
  expect(instance).toBeDefined();

  const vm1 = instance?.viewModel('vm1');
  const vm2 = instance?.viewModel('vm2');
  expect(vm1).toBeDefined();
  expect(vm2).toBeDefined();

  expect(instance?.viewModel('nonexistent')).toBeUndefined();

  expect(vm1?.instanceName).toBeDefined();
  expect(typeof vm1?.instanceName).toBe('string');
  expect(vm1?.stringProperty('name')).toBeDefined();
}

export function testReplaceViewModelSharesState(file: RiveFile): void {
  const vm = file.defaultArtboardViewModel();
  const instance = vm?.createDefaultInstance();
  expect(instance).toBeDefined();

  const vm2Instance = instance?.viewModel('vm2');
  expect(vm2Instance).toBeDefined();

  const vm2NameProp = vm2Instance?.stringProperty('name');
  expect(vm2NameProp).toBeDefined();
  const testValue = `test-${Date.now()}`;
  vm2NameProp!.value = testValue;

  instance?.replaceViewModel('vm1', vm2Instance!);

  const vm1AfterReplace = instance?.viewModel('vm1');
  const vm1NameProp = vm1AfterReplace?.stringProperty('name');
  expect(vm1NameProp?.value).toBe(testValue);
}

export const viewModelTests: TestSuite = {
  name: 'ViewModel',
  tests: [
    {
      name: 'viewModel() basic functionality',
      run: async () => {
        const file = await RiveFileFactory.fromSource(ASSET, undefined);
        testViewModelBasicFunctionality(file);
        return { status: 'passed' as const };
      },
    },
    {
      name: 'replaceViewModel() replaces and shares state',
      run: async () => {
        const file = await RiveFileFactory.fromSource(ASSET, undefined);
        testReplaceViewModelSharesState(file);
        return { status: 'passed' as const };
      },
    },
  ],
};
