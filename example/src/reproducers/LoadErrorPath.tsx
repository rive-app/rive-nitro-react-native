import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  RiveView,
  useRiveFile,
  Fit,
  type RiveViewRef,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Reproducer for review finding H2 (iOS experimental backend).
 *
 * A configure failure (e.g. a typo'd artboardName) must invoke onError and
 * settle awaitViewReady(). On the broken build the error is only logged
 * natively: onError never fires and awaitViewReady() hangs forever.
 */

const AWAIT_TIMEOUT_MS = 6000;

export default function LoadErrorPath() {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/quick_start.riv')
  );
  const [mounted, setMounted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [readyResult, setReadyResult] = useState('not started');
  const viewRef = useRef<RiveViewRef | null>(null);

  const run = async () => {
    setErrors([]);
    setReadyResult('waiting...');
    setMounted(true);
  };

  const onRef = (ref: RiveViewRef) => {
    viewRef.current = ref;
    const timeout = new Promise<string>((resolve) =>
      setTimeout(() => resolve('TIMED OUT (bug)'), AWAIT_TIMEOUT_MS)
    );
    const ready = ref
      .awaitViewReady()
      .then(() => 'resolved')
      .catch((e: unknown) => `rejected: ${String(e)}`);
    Promise.race([ready, timeout]).then(setReadyResult);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Load Error Path</Text>
      <Text style={styles.subtitle}>
        Mounts a RiveView with a bad artboardName. onError must fire and
        awaitViewReady() must settle.
      </Text>
      <Pressable style={styles.button} onPress={run}>
        <Text style={styles.buttonText}>Mount with bad artboardName</Text>
      </Pressable>
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>
          awaitViewReady: {readyResult}
          {'\n'}onError calls: {errors.length}
          {errors.length > 0 ? `\nlast: ${errors[errors.length - 1]}` : ''}
        </Text>
      </View>
      <View style={styles.riveContainer}>
        {mounted && riveFile && (
          <RiveView
            hybridRef={{ f: onRef }}
            file={riveFile}
            artboardName="DoesNotExist"
            fit={Fit.Contain}
            style={styles.rive}
            autoPlay={true}
            onError={(e) => {
              setErrors((prev) => [...prev, `${e.type}: ${e.message}`]);
            }}
          />
        )}
      </View>
    </View>
  );
}

LoadErrorPath.metadata = {
  name: 'Load Error Path',
  description:
    'Experimental backend: configure failures must reach onError and settle awaitViewReady()',
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
