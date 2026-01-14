import type { TestSuite } from '../types';
import { riveFileTests } from './riveFileTests';
import { viewModelTests } from './viewModelTests';

export const allSuites: TestSuite[] = [riveFileTests, viewModelTests];
