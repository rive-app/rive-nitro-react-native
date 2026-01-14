export type { TestCase, TestSuite } from './registry';
export { getSuites } from './registry';
export type { TestStatus } from './types';

// Import tests to register them
import './tests';
