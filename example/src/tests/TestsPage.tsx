import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { getTestCollector } from 'react-native-harness';
// @ts-expect-error - internal module not exported
import { TestComponentOverlay } from '@react-native-harness/runtime/dist/render/TestComponentOverlay';
import type { TestSuite, TestCase } from '@react-native-harness/bridge';
import { useState, useEffect } from 'react';
import type { Metadata } from '../shared/metadata';

const testContext = require.context(
  '../../__tests__',
  false,
  /\.harness\.tsx?$/
);

// Cache collected suites globally (persists across HMR, require.context only executes once)
const CACHE_KEY = '__RIVE_TEST_SUITES__';
type GlobalCache = { [CACHE_KEY]?: TestSuite[] };

function getCachedSuites(): TestSuite[] | null {
  return (global as unknown as GlobalCache)[CACHE_KEY] ?? null;
}

function setCachedSuites(suites: TestSuite[]): void {
  (global as unknown as GlobalCache)[CACHE_KEY] = suites;
}

type TestStatus = 'pending' | 'running' | 'passed' | 'failed';

interface TestState {
  status: TestStatus;
  error?: string;
}

function buildTestStates(suites: TestSuite[]): Map<string, TestState> {
  const states = new Map<string, TestState>();
  for (const suite of suites) {
    for (const test of suite.tests) {
      states.set(`${suite.name}::${test.name}`, { status: 'pending' });
    }
  }
  return states;
}

export default function TestsPage() {
  const cached = getCachedSuites();
  const [suites, setSuites] = useState<TestSuite[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);
  const [testStates, setTestStates] = useState<Map<string, TestState>>(() =>
    cached ? buildTestStates(cached) : new Map()
  );
  const [runningAll, setRunningAll] = useState(false);

  useEffect(() => {
    if (getCachedSuites() !== null) return;

    async function collectTests() {
      const collector = getTestCollector();
      const result = await collector.collect(() => {
        testContext.keys().forEach((key) => testContext(key));
      }, 'harness-tests');

      const collectedSuites = result.testSuite.suites;
      setCachedSuites(collectedSuites);
      setSuites(collectedSuites);
      setTestStates(buildTestStates(collectedSuites));
      setLoading(false);
    }
    collectTests();
  }, []);

  function getTestKey(suiteName: string, testName: string): string {
    return `${suiteName}::${testName}`;
  }

  async function runTest(suiteName: string, test: TestCase) {
    const key = getTestKey(suiteName, test.name);
    setTestStates((prev) => new Map(prev).set(key, { status: 'running' }));

    try {
      await test.fn();
      setTestStates((prev) => new Map(prev).set(key, { status: 'passed' }));
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setTestStates((prev) =>
        new Map(prev).set(key, {
          status: 'failed',
          error: errorMessage,
        })
      );
    }
  }

  async function runAllTests() {
    setRunningAll(true);

    for (const suite of suites) {
      for (const test of suite.tests) {
        await runTest(suite.name, test);
      }
    }

    setRunningAll(false);
  }

  function getStatusIcon(status: TestStatus): string {
    switch (status) {
      case 'pending':
        return '○';
      case 'running':
        return '◌';
      case 'passed':
        return '✓';
      case 'failed':
        return '✗';
    }
  }

  function getStatusColor(status: TestStatus): string {
    switch (status) {
      case 'pending':
        return '#888';
      case 'running':
        return '#007AFF';
      case 'passed':
        return '#34C759';
      case 'failed':
        return '#FF3B30';
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Collecting tests...</Text>
      </View>
    );
  }

  const passedCount = Array.from(testStates.values()).filter(
    (s) => s.status === 'passed'
  ).length;
  const failedCount = Array.from(testStates.values()).filter(
    (s) => s.status === 'failed'
  ).length;
  const totalCount = testStates.size;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Test Runner</Text>
        <Text style={styles.summary}>
          {passedCount}/{totalCount} passed
          {failedCount > 0 && ` • ${failedCount} failed`}
        </Text>
        <TouchableOpacity
          style={[styles.runAllButton, runningAll && styles.buttonDisabled]}
          onPress={runAllTests}
          disabled={runningAll}
        >
          <Text style={styles.runAllButtonText}>
            {runningAll ? 'Running...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {suites.map((suite) => (
          <View key={suite.name} style={styles.suite}>
            <Text style={styles.suiteName}>{suite.name}</Text>
            {suite.tests.map((test) => {
              const key = getTestKey(suite.name, test.name);
              const state = testStates.get(key) || { status: 'pending' };
              return (
                <TouchableOpacity
                  key={test.name}
                  style={styles.testRow}
                  onPress={() => runTest(suite.name, test)}
                  disabled={state.status === 'running'}
                >
                  <Text
                    style={[
                      styles.statusIcon,
                      { color: getStatusColor(state.status) },
                    ]}
                  >
                    {getStatusIcon(state.status)}
                  </Text>
                  <View style={styles.testInfo}>
                    <Text style={styles.testName}>{test.name}</Text>
                    {state.error && (
                      <Text style={styles.testError}>{state.error}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <TestComponentOverlay />
    </View>
  );
}

TestsPage.metadata = {
  name: 'Tests',
  description: 'In-app test runner for Rive React Native',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summary: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  runAllButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  runAllButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  suite: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  suiteName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingLeft: 8,
  },
  statusIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    width: 24,
    marginRight: 8,
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontSize: 14,
    color: '#333',
  },
  testError: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    fontFamily: 'monospace',
  },
});
