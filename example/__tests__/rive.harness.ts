import { describe, it, beforeAll } from 'react-native-harness';
import { RiveFileFactory } from '@rive-app/react-native';
import type { RiveFile } from '@rive-app/react-native';
import { viewModelTestDefinitions } from '../src/testing/suites/viewModelTests';

const ASSET_URL =
  'http://localhost:8081/assets/assets/rive/viewmodelproperty.riv';

describe('ViewModel', () => {
  let file: RiveFile;

  beforeAll(async () => {
    file = await RiveFileFactory.fromURL(ASSET_URL, undefined);
  });

  for (const [name, testFn] of Object.entries(viewModelTestDefinitions)) {
    it(name, async () => {
      testFn(file);
    });
  }
});
