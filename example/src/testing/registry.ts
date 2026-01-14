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
  // First pass: collect for UI
  const suite: TestSuite = { name, tests: [] };
  const prevSuite = currentSuite;
  currentSuite = suite;
  collectingForUI = true;
  fn();
  collectingForUI = false;
  suites.push(suite);
  currentSuite = prevSuite;

  // Second pass: register with harness (uses harness's own it)
  harnessDescribe(name, fn);
}

export function it(name: string, fn: () => Promise<void>): void {
  if (collectingForUI && currentSuite) {
    // Collecting for UI
    currentSuite.tests.push({ name, fn });
  } else {
    // Inside harness's describe callback
    harnessIt(name, fn);
  }
}

export function getSuites(): TestSuite[] {
  return suites;
}

// Re-export expect from harness
export { expect } from 'react-native-harness';
