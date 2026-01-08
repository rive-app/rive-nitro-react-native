import type { RiveFile } from '@rive-app/react-native';

export type JSType =
  | 'string'
  | 'number'
  | 'bigint'
  | 'boolean'
  | 'symbol'
  | 'undefined'
  | 'object'
  | 'function';

export interface AssertionBackend {
  assertEqual<T>(actual: T, expected: T, message: string): void;
  assertNotThrow(error: Error | undefined, message: string): void;
  assertThrow(
    error: Error | undefined,
    expectedMessage: string | undefined,
    message: string
  ): void;
  assertType(value: unknown, expectedType: JSType, message: string): void;
  assertInstanceOf(
    value: unknown,
    constructor: new (...args: unknown[]) => unknown,
    message: string
  ): void;
  assertContains(value: object, key: string, message: string): void;
  assertIsArray(value: unknown, message: string): void;
  assertStringContains(value: string, substring: string, message: string): void;
  assertDefined(value: unknown, message: string): void;
  assertUndefined(value: unknown, message: string): void;
}

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed';

export interface TestResult {
  status: 'passed' | 'failed';
  error?: string;
}

export interface TestCase {
  name: string;
  run: () => Promise<TestResult>;
}

export interface TestSuite {
  name: string;
  riveAsset: number;
  getTests: (file: RiveFile, backend: AssertionBackend) => TestCase[];
}
