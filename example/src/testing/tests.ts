import { RiveFileFactory } from '@rive-app/react-native';
import { expect } from 'react-native-harness';

const QUICK_START = require('../../assets/rive/quick_start.riv');
const VIEWMODEL = require('../../assets/rive/viewmodelproperty.riv');

export interface TestCase {
  name: string;
  fn: () => Promise<void>;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
}

export const suites: TestSuite[] = [
  {
    name: 'RiveFile Loading',
    tests: [
      {
        name: 'fromSource with require() works',
        fn: async () => {
          const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
          expect(file).toBeDefined();
          expect(file.artboardNames).toContain('health_bar_v01');
        },
      },
      {
        name: 'fromURL works',
        fn: async () => {
          const file = await RiveFileFactory.fromURL(
            'http://localhost:8081/assets/assets/rive/viewmodelproperty.riv',
            undefined
          );
          expect(file).toBeDefined();
          expect(file.artboardNames.length).toBeGreaterThan(0);
        },
      },
    ],
  },
  {
    name: 'ViewModel',
    tests: [
      {
        name: 'viewModel() basic functionality',
        fn: async () => {
          const file = await RiveFileFactory.fromSource(VIEWMODEL, undefined);
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
        },
      },
      {
        name: 'replaceViewModel() replaces and shares state',
        fn: async () => {
          const file = await RiveFileFactory.fromSource(VIEWMODEL, undefined);
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
        },
      },
    ],
  },
];
