import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { RiveFileFactory } from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Discussion #433 / margelo/nitro#1652: with Xcode 27, Swift-compiled Nitro code turns errors into
 * C++ exceptions through `std::make_exception_ptr`, which references libc++ symbols that only exist
 * on iOS 18+. Unfixed builds abort at launch on iOS < 18.
 *
 * Start rejects native promises in a loop, which drives Swift errors through `Error.toCpp()`.
 * Expected: every call rejects with the native message and the app keeps running.
 */

const BATCH = 25;

const cases: Array<{ run: () => Promise<unknown>; message: string }> = [
  {
    run: () => RiveFileFactory.fromResource('issue433_missing', undefined),
    message: 'Could not find Rive file: issue433_missing.riv',
  },
  {
    run: () => RiveFileFactory.fromFileURL('https://example.com/issue433.riv'),
    message: 'fromFileURL: URL must be a file URL',
  },
];

export default function Issue433ExceptionPtr() {
  const [running, setRunning] = useState(false);
  const [passed, setPassed] = useState(0);
  const [failed, setFailed] = useState(0);
  const [lastMessage, setLastMessage] = useState('');
  const runningRef = useRef(false);

  const runBatch = useCallback(async () => {
    for (let i = 0; i < BATCH; i++) {
      const testCase = cases[i % cases.length]!;
      try {
        await testCase.run();
        setFailed((n) => n + 1);
        setLastMessage('resolved unexpectedly');
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setLastMessage(message);
        if (message.includes(testCase.message)) {
          setPassed((n) => n + 1);
        } else {
          setFailed((n) => n + 1);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    runningRef.current = true;
    let cancelled = false;
    (async () => {
      while (!cancelled && runningRef.current) {
        await runBatch();
        await new Promise((r) => setTimeout(r, 50));
      }
    })();
    return () => {
      cancelled = true;
      runningRef.current = false;
    };
  }, [running, runBatch]);

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.button}
        onPress={() => setRunning((r) => !r)}
        testID="issue433-toggle"
      >
        <Text style={styles.buttonText}>{running ? 'Stop' : 'Start'}</Text>
      </Pressable>
      <Text style={styles.counter} testID="issue433-passed">
        rejected as expected: {passed}
      </Text>
      <Text style={styles.counter} testID="issue433-failed">
        unexpected: {failed}
      </Text>
      <Text style={styles.message}>last: {lastMessage}</Text>
    </View>
  );
}

Issue433ExceptionPtr.metadata = {
  name: 'Issue #433 exception_ptr',
  description:
    'Rejects native promises through Swift Error.toCpp() (Xcode 27, iOS < 18)',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  counter: { fontSize: 18 },
  message: { fontSize: 14, color: '#555' },
});
