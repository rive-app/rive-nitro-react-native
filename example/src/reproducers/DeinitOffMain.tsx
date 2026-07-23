import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  RiveView,
  NitroRiveView,
  useRiveFile,
  Fit,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Reproducer for review finding H5 (iOS experimental backend).
 *
 * RiveReactNativeView.deinit runs MainActor.assumeIsolated { cleanup() }, but
 * deinit is nonisolated: if the last strong reference is dropped off the main
 * thread (Nitro destroys the C++ hybrid part on the JS thread via the
 * dispose() the RiveView wrapper calls on unmount, or on the Hermes GC
 * thread), cleanup()'s dispatchPrecondition(.onQueue(.main)) traps.
 *
 * Rapid mount/unmount cycles + forced GC try to hit the window where Fabric's
 * main-thread release happens first and the JS/GC thread does the final one.
 * PASS = survives all cycles. FAIL = app crashes (EXC_BREAKPOINT /
 * dispatchPrecondition trap in RiveReactNativeView.cleanup).
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

declare const global: { gc?: () => void };

function RiveContent({ raw }: { raw: boolean }) {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/quick_start.riv')
  );
  if (!riveFile) return <Text>Loading...</Text>;
  if (raw) {
    // Raw host component: no dispose-on-unmount, so the Swift HybridRiveView
    // is released whenever Hermes GCs the JS wrapper — i.e. on the GC thread.
    return (
      <NitroRiveView
        file={riveFile}
        fit={Fit.Contain}
        style={styles.rive}
        autoPlay={true}
        onError={{ f: (e) => console.log('raw onError', e.message) }}
        onStop={{ f: () => console.log('raw onStop') }}
      />
    );
  }
  return (
    <RiveView
      file={riveFile}
      fit={Fit.Contain}
      style={styles.rive}
      autoPlay={true}
    />
  );
}

export default function DeinitOffMain() {
  const [mounted, setMounted] = useState(false);
  const [raw, setRaw] = useState(false);
  const [status, setStatus] = useState('idle');
  const runningRef = useRef(false);

  const run = async (cycles: number, useRaw: boolean) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRaw(useRaw);
    for (let i = 0; i < cycles; i++) {
      setStatus(`${useRaw ? 'raw ' : ''}cycle ${i + 1}/${cycles}`);
      setMounted(true);
      // Vary timing to catch different interleavings of the main-thread
      // (Fabric) and JS-thread (dispose) releases.
      await sleep(50 + (i % 7) * 30);
      setMounted(false);
      await sleep(10 + (i % 3) * 20);
      global.gc?.();
    }
    setStatus('done — no crash (PASS)');
    runningRef.current = false;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deinit Off-Main</Text>
      <Text style={styles.subtitle}>
        Rapid mount/unmount + GC. A crash in RiveReactNativeView.cleanup() means
        the off-main deinit trap fired.
      </Text>
      <Pressable style={styles.button} onPress={() => run(30, false)}>
        <Text style={styles.buttonText}>Run 30 cycles</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => run(30, true)}>
        <Text style={styles.buttonText}>Run 30 raw cycles (GC release)</Text>
      </Pressable>
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>{status}</Text>
      </View>
      <View style={styles.riveContainer}>
        {mounted && <RiveContent raw={raw} />}
      </View>
    </View>
  );
}

DeinitOffMain.metadata = {
  name: 'Deinit Off-Main',
  description:
    'iOS experimental backend: releasing the view off the main thread must not trap in deinit',
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
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
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
