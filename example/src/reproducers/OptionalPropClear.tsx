import { Component, useRef, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import {
  RiveView,
  useRiveFile,
  Fit,
  Alignment,
  DataBindMode,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Reproducer: clearing an optional RiveView prop (string -> undefined) throws
 * "Exception in HostFunction: RiveView.<prop>: Value is null, expected a String".
 *
 * When a prop is removed, Fabric's prop diff sends `null` to native. Nitro's
 * generated prop parser converts optionals via JSIConverter<std::optional<T>>,
 * which only maps `undefined` to nullopt — `null` falls through to the inner
 * converter and throws. The throw happens during React's render (Fabric
 * cloneNodeWithNewProps), so an error boundary can catch it.
 *
 * "Run all" sets each optional prop to a value, then re-renders with the prop
 * removed. FAIL = clearing the prop threw, PASS = it was accepted.
 */

const TESTS: { prop: string; value: unknown; label: string }[] = [
  { prop: 'artboardName', value: 'Artboard', label: 'artboardName (string)' },
  {
    prop: 'stateMachineName',
    value: 'State Machine 1',
    label: 'stateMachineName (string)',
  },
  { prop: 'autoPlay', value: true, label: 'autoPlay (boolean)' },
  { prop: 'alignment', value: Alignment.Center, label: 'alignment (enum)' },
  { prop: 'fit', value: Fit.Contain, label: 'fit (enum)' },
  {
    prop: 'layoutScaleFactor',
    value: 2,
    label: 'layoutScaleFactor (number)',
  },
  { prop: 'dataBind', value: DataBindMode.Auto, label: 'dataBind (variant)' },
];

type Result = { label: string; outcome: 'pass' | 'fail'; error?: string };

class CatchBoundary extends Component<
  { onCatch: (error: Error) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onCatch(error);
  }

  render() {
    if (this.state.failed) {
      return <Text style={styles.crashText}>view crashed</Text>;
    }
    return this.props.children;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function OptionalPropClear() {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/bouncing_ball.riv')
  );
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('idle');
  const [testProps, setTestProps] = useState<Record<string, unknown>>({});
  const [mountKey, setMountKey] = useState(0);
  const caughtRef = useRef<Error | null>(null);

  const runAll = async () => {
    if (!riveFile || running) return;
    setRunning(true);
    setResults([]);
    const collected: Result[] = [];

    for (const test of TESTS) {
      caughtRef.current = null;
      setMountKey((k) => k + 1);
      setStatus(`${test.prop}: setting value...`);
      setTestProps({ [test.prop]: test.value });
      await sleep(350);

      setStatus(`${test.prop}: clearing to undefined...`);
      setTestProps({});
      await sleep(350);

      const error = caughtRef.current;
      collected.push(
        error
          ? {
              label: test.label,
              outcome: 'fail',
              error: String(error).split('\n')[0],
            }
          : { label: test.label, outcome: 'pass' }
      );
      setResults([...collected]);
    }

    const failed = collected.filter((r) => r.outcome === 'fail');
    setStatus(
      failed.length === 0
        ? 'PASS: all optional props can be cleared'
        : `FAIL: clearing ${failed.length}/${collected.length} props threw`
    );
    console.log(
      `[OptionalPropClear] ${failed.length === 0 ? 'PASS' : 'FAIL'}: ` +
        collected.map((r) => `${r.label}=${r.outcome}`).join(', ')
    );
    setRunning(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Optional Prop Clear</Text>
      <Text style={styles.subtitle}>
        Sets each optional RiveView prop, then clears it back to undefined
      </Text>

      <Pressable
        style={[styles.button, running && styles.buttonDisabled]}
        onPress={runAll}
        disabled={running || !riveFile}
      >
        <Text style={styles.buttonText}>
          {riveFile ? 'Run all' : 'Loading file...'}
        </Text>
      </Pressable>

      <Text style={styles.status}>{status}</Text>

      <ScrollView style={styles.results}>
        {results.map((r) => (
          <View key={r.label} style={styles.resultRow}>
            <Text
              style={[
                styles.resultBadge,
                r.outcome === 'pass' ? styles.pass : styles.fail,
              ]}
            >
              {r.outcome.toUpperCase()}
            </Text>
            <View style={styles.resultBody}>
              <Text style={styles.resultLabel}>{r.label}</Text>
              {r.error != null && (
                <Text style={styles.resultError}>{r.error}</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.riveContainer}>
        {riveFile && (
          <CatchBoundary
            key={mountKey}
            onCatch={(error) => {
              caughtRef.current = error;
            }}
          >
            <RiveView
              file={riveFile}
              style={styles.rive}
              onError={(e) => console.log('[OptionalPropClear] onError', e)}
              {...testProps}
            />
          </CatchBoundary>
        )}
      </View>
    </View>
  );
}

OptionalPropClear.metadata = {
  name: 'Optional Prop Clear',
  description:
    'Clearing optional RiveView props (value -> undefined) must not throw "Value is null" in the Nitro prop parser',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  status: {
    fontSize: 13,
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  results: {
    flexGrow: 0,
    maxHeight: 280,
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
    gap: 8,
  },
  resultBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    color: '#fff',
  },
  pass: {
    backgroundColor: '#34C759',
  },
  fail: {
    backgroundColor: '#FF3B30',
  },
  resultBody: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultError: {
    fontSize: 11,
    color: '#B00020',
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  riveContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  rive: {
    flex: 1,
  },
  crashText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#B00020',
  },
});
