import type { RiveFile } from '@rive-app/react-native';

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
  getTests: (file: RiveFile) => TestCase[];
}
