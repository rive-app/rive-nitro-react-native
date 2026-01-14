import { RiveFileFactory } from '@rive-app/react-native';
import { expect } from 'react-native-harness';
import type { TestSuite } from '../types';

const QUICK_START_ASSET = require('../../../assets/rive/quick_start.riv');

export const riveFileTests: TestSuite = {
  name: 'RiveFile Loading',
  tests: [
    {
      name: 'fromSource with require() works',
      run: async () => {
        const file = await RiveFileFactory.fromSource(
          QUICK_START_ASSET,
          undefined
        );
        expect(file).toBeDefined();
        expect(file.artboardNames).toContain('health_bar_v01');
        return { status: 'passed' as const };
      },
    },
    {
      name: 'fromURL works',
      run: async () => {
        const file = await RiveFileFactory.fromURL(
          'http://localhost:8081/assets/assets/rive/viewmodelproperty.riv',
          undefined
        );
        expect(file).toBeDefined();
        expect(file.artboardNames.length).toBeGreaterThan(0);
        return { status: 'passed' as const };
      },
    },
  ],
};
