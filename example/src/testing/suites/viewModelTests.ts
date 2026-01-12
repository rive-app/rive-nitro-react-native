import type { RiveFile } from '@rive-app/react-native';
import { expect } from 'react-native-harness';
import type { TestCase, TestSuite } from '../types';

export const viewModelTests: TestSuite = {
  name: 'ViewModel',
  riveAsset: require('../../../assets/rive/viewmodelproperty.riv'),
  getTests: (file: RiveFile): TestCase[] => {
    return [
      {
        name: 'viewModel() basic functionality',
        run: async () => {
          const vm = file.defaultArtboardViewModel();
          const instance = vm?.createDefaultInstance();

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

          return { status: 'passed' };
        },
      },
      {
        name: 'replaceViewModel() replaces and shares state',
        run: async () => {
          const vm = file.defaultArtboardViewModel();
          const instance = vm?.createDefaultInstance();

          const vm2Instance = instance?.viewModel('vm2');
          expect(vm2Instance).toBeDefined();

          // Set a test value on vm2
          const vm2NameProp = vm2Instance!.stringProperty('name');
          expect(vm2NameProp).toBeDefined();

          expect(undefined).toBeDefined();

          const testValue = `test-${Date.now()}`;
          vm2NameProp!.value = testValue;

          // Replace vm1 with vm2's instance
          instance?.replaceViewModel('vm1', vm2Instance!);

          // After replacement, vm1 should share vm2's state
          const vm1AfterReplace = instance?.viewModel('vm1');
          const vm1NameProp = vm1AfterReplace?.stringProperty('name');
          expect(vm1NameProp?.value).toBe(testValue);

          return { status: 'passed' };
        },
      },
    ];
  },
};
