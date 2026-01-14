import { describe, it, beforeAll } from 'react-native-harness';
import { RiveFileFactory } from '@rive-app/react-native';
import type { RiveFile } from '@rive-app/react-native';
import {
  testViewModelBasicFunctionality,
  testReplaceViewModelSharesState,
} from '../src/testing/suites/viewModelTests';

const ASSET_URL =
  'http://localhost:8081/assets/assets/rive/viewmodelproperty.riv';

describe('ViewModel', () => {
  let file: RiveFile;

  beforeAll(async () => {
    file = await RiveFileFactory.fromURL(ASSET_URL, undefined);
  });

  it('viewModel() basic functionality', () => {
    testViewModelBasicFunctionality(file);
  });

  it('replaceViewModel() replaces and shares state', () => {
    testReplaceViewModelSharesState(file);
  });
});
