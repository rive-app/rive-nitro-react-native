import {
  describe as harnessDescribe,
  it as harnessIt,
} from 'react-native-harness';

export interface TestCase {
  name: string;
  fn: () => Promise<void>;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
}

const suites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;
let collectingForUI = false;

export function describe(name: string, fn: () => void): void {
  const suite: TestSuite = { name, tests: [] };
  const prevSuite = currentSuite;
  currentSuite = suite;
  collectingForUI = true;
  fn();
  collectingForUI = false;
  suites.push(suite);
  currentSuite = prevSuite;

  harnessDescribe(name, fn);
}

export function it(name: string, fn: () => Promise<void>): void {
  if (collectingForUI && currentSuite) {
    currentSuite.tests.push({ name, fn });
  } else {
    harnessIt(name, fn);
  }
}

export function getSuites(): TestSuite[] {
  return suites;
}

export { expect } from 'react-native-harness';
