import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { RiveView, useRiveFile, Fit } from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Reproducer for review finding H4 (Android experimental backend).
 *
 * Every reload creates a new state machine without deleting the old handle,
 * and every ViewModelInstance created via the JS API is never closed — the
 * command-server objects accumulate for the app's lifetime.
 *
 * Start the stress loop, then watch native heap growth:
 *   adb shell dumpsys meminfo rive.example | grep "Native Heap"
 * Broken: native heap grows roughly linearly with the iteration counter and
 * never comes back down. Fixed: it plateaus.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ReloadHandleLeak() {
  // artboard_db_test.riv has multiple artboards, so the reload stress can
  // alternate between two real names (setting artboardName back to undefined
  // currently throws in the Nitro prop layer).
  const { riveFile } = useRiveFile(
    require('../../assets/rive/artboard_db_test.riv')
  );
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<'reload' | 'vmi'>('reload');
  const [iterations, setIterations] = useState(0);
  const [artboardName, setArtboardName] = useState<string | undefined>(
    undefined
  );
  const runningRef = useRef(false);
  const namesRef = useRef<string[]>([]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    if (!running || !riveFile) return;
    let cancelled = false;
    (async () => {
      if (namesRef.current.length === 0) {
        namesRef.current = await riveFile.getArtboardNamesAsync();
      }
      const [nameA, nameB] = namesRef.current;
      // Created once: defaultArtboardViewModelAsync itself allocates an
      // artboard handle per call, which would drown out the per-instance
      // signal this page measures.
      const vm = await riveFile.defaultArtboardViewModelAsync();
      while (runningRef.current && !cancelled) {
        if (mode === 'reload') {
          // Alternating between two artboards forces a reload each time;
          // each reload creates (and on the broken build leaks) a state machine.
          setArtboardName((cur) => (cur === nameA ? nameB : nameA));
        } else {
          // Each created instance wraps a native handle. dispose() is what the
          // library hooks call on cleanup — on the broken build it does not
          // close the native handle.
          const inst = await vm?.createDefaultInstanceAsync();
          inst?.dispose();
        }
        setIterations((c) => c + 1);
        await sleep(mode === 'reload' ? 50 : 5);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [running, mode, riveFile]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reload / VMI Handle Leak</Text>
      <Text style={styles.subtitle}>
        Stress loop leaking state-machine or view-model-instance handles. Watch
        `dumpsys meminfo` native heap.
      </Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.button, mode === 'reload' && styles.buttonActive]}
          onPress={() => setMode('reload')}
        >
          <Text style={styles.buttonText}>Mode: reload</Text>
        </Pressable>
        <Pressable
          style={[styles.button, mode === 'vmi' && styles.buttonActive]}
          onPress={() => setMode('vmi')}
        >
          <Text style={styles.buttonText}>Mode: VMI create</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.startButton]}
          onPress={() => setRunning((r) => !r)}
        >
          <Text style={styles.buttonText}>{running ? 'Stop' : 'Start'}</Text>
        </Pressable>
      </View>
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>
          {running ? 'running' : 'stopped'} — iterations: {iterations}
        </Text>
      </View>
      <View style={styles.riveContainer}>
        {riveFile && (
          <RiveView
            file={riveFile}
            artboardName={artboardName}
            fit={Fit.Contain}
            style={styles.rive}
            autoPlay={true}
          />
        )}
      </View>
    </View>
  );
}

ReloadHandleLeak.metadata = {
  name: 'Reload / VMI Handle Leak',
  description:
    'Experimental backend: reloads and VMI creation must not leak native command-server handles',
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
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#8E8E93',
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: '#007AFF',
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statusBox: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 13,
    color: '#333',
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
});
