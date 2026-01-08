import type { RiveFile } from '@rive-app/react-native';
import { createTestRunner } from '../createTestRunner';
import type { AssertionBackend, TestCase, TestSuite } from '../types';

export const viewModelTests: TestSuite = {
  name: 'ViewModel',
  riveAsset: require('../../../assets/rive/viewmodelproperty.riv'),
  getTests: (file: RiveFile, backend: AssertionBackend): TestCase[] => {
    const { it } = createTestRunner(backend);

    return [
      {
        name: 'viewModel() basic functionality',
        run: async () => {
          const vm = file.defaultArtboardViewModel();
          const instance = vm?.createDefaultInstance();

          // Valid paths return instances
          const vm1 = instance?.viewModel('vm1');
          const vm2 = instance?.viewModel('vm2');
          it(() => vm1).toBeDefined();
          it(() => vm2).toBeDefined();

          // Invalid path returns undefined
          it(() => instance?.viewModel('nonexistent')).toBeUndefined();

          // Nested instance has expected properties
          it(() => vm1?.instanceName)
            .toBeDefined()
            .didReturn('string');
          it(() => vm1?.stringProperty('name')).toBeDefined();

          return { status: 'passed' };
        },
      },
      {
        name: 'replaceViewModel() replaces and shares state',
        run: async () => {
          const vm = file.defaultArtboardViewModel();
          const instance = vm?.createDefaultInstance();

          const vm2Instance = instance?.viewModel('vm2');
          if (!vm2Instance) {
            throw new Error('vm2 instance not found');
          }

          // Set a test value on vm2
          const vm2NameProp = vm2Instance.stringProperty('name');
          if (!vm2NameProp) {
            throw new Error('vm2 name property not found');
          }
          const testValue = `test-${Date.now()}`;
          vm2NameProp.value = testValue;

          // Replace vm1 with vm2's instance
          it(() =>
            instance?.replaceViewModel('vm1', vm2Instance)
          ).didNotThrow();

          // After replacement, vm1 should share vm2's state
          const vm1AfterReplace = instance?.viewModel('vm1');
          const vm1NameProp = vm1AfterReplace?.stringProperty('name');
          it(() => vm1NameProp?.value).equals(testValue);

          return { status: 'passed' };
        },
      },
    ];
  },
};
