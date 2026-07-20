import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { RiveView, useRiveFile, Fit } from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Reproducer for the experimental-backend unmount leak (review finding C1).
 *
 * The new Android backend never calls RiveReactNativeView.dispose(), so every
 * unmounted RiveView keeps its Choreographer frame callback re-posting forever
 * (leaking the view, its coroutine scope, and its RiveErrorLogger listener).
 *
 * Run N mount/unmount cycles, then watch logcat:
 *   adb logcat -s RiveReactNativeView:D | grep REPRO-C1
 * Broken: one heartbeat per second per leaked view with attached=false.
 * Fixed: heartbeats stop after unmount.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function RiveContent() {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/quick_start.riv')
  );
  if (!riveFile) return <Text>Loading...</Text>;
  return (
    <RiveView
      file={riveFile}
      fit={Fit.Contain}
      style={styles.rive}
      autoPlay={true}
    />
  );
}

export default function UnmountRenderLoopLeak() {
  const [mounted, setMounted] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [status, setStatus] = useState('idle');
  const runningRef = useRef(false);

  const run = async (count: number) => {
    if (runningRef.current) return;
    runningRef.current = true;
    for (let i = 0; i < count; i++) {
      setStatus(`cycle ${i + 1}/${count}: mounting`);
      setMounted(true);
      await sleep(1200);
      setStatus(`cycle ${i + 1}/${count}: unmounting`);
      setMounted(false);
      await sleep(400);
      setCycles((c) => c + 1);
    }
    setStatus(
      'done — check logcat for REPRO-C1 heartbeats with attached=false'
    );
    runningRef.current = false;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unmount Render-Loop Leak</Text>
      <Text style={styles.subtitle}>
        Every unmounted RiveView should stop its render loop. Leaked views keep
        heartbeating in logcat (REPRO-C1).
      </Text>
      <Pressable style={styles.button} onPress={() => run(5)}>
        <Text style={styles.buttonText}>Run 5 mount/unmount cycles</Text>
      </Pressable>
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>
          {status} (completed cycles: {cycles})
        </Text>
      </View>
      <View style={styles.riveContainer}>{mounted && <RiveContent />}</View>
    </View>
  );
}

UnmountRenderLoopLeak.metadata = {
  name: 'Unmount Render-Loop Leak',
  description:
    'Experimental backend: unmounted views must stop their render loop and be disposed',
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
