import { describe, it, expect } from 'react-native-harness';
import { RiveFileFactory } from '@rive-app/react-native';
import {
  testViewModelBasicFunctionality,
  testReplaceViewModelSharesState,
} from '../src/testing/suites/viewModelTests';

const QUICK_START = require('../assets/rive/quick_start.riv');
const VIEWMODEL = require('../assets/rive/viewmodelproperty.riv');

describe('RiveFile Loading', () => {
  it('fromSource with require() works', async () => {
    const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
    expect(file).toBeDefined();
    expect(file.artboardNames).toContain('health_bar_v01');
  });
});

describe('ViewModel', () => {
  it('viewModel() basic functionality', async () => {
    const file = await RiveFileFactory.fromSource(VIEWMODEL, undefined);
    testViewModelBasicFunctionality(file);
  });

  it('replaceViewModel() replaces and shares state', async () => {
    const file = await RiveFileFactory.fromSource(VIEWMODEL, undefined);
    testReplaceViewModelSharesState(file);
  });
});
