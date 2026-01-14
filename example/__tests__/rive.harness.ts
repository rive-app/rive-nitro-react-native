import { describe, it, beforeAll, expect } from 'react-native-harness';
import { RiveFileFactory } from '@rive-app/react-native';
import type { RiveFile } from '@rive-app/react-native';
import {
  testViewModelBasicFunctionality,
  testReplaceViewModelSharesState,
} from '../src/testing/suites/viewModelTests';

const ASSET_URL =
  'http://localhost:8081/assets/assets/rive/viewmodelproperty.riv';

describe('RiveFile Loading', () => {
  it('fromSource with require() works', async () => {
    const file = await RiveFileFactory.fromSource(
      require('../assets/rive/quick_start.riv'),
      undefined
    );
    expect(file).toBeDefined();
    expect(file.artboardNames).toContain('health_bar_v01');
  });

  it('fromURL works', async () => {
    const file = await RiveFileFactory.fromURL(ASSET_URL, undefined);
    expect(file).toBeDefined();
    expect(file.artboardNames.length).toBeGreaterThan(0);
  });
});

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
