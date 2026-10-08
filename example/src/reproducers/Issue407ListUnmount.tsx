import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  useRiveFile,
  useRiveList,
  useViewModelInstance,
  type ViewModelInstance,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Issue #407: useRiveList's cleanup called a method on a list property that
 * useDisposableMemo had already disposed. Debug builds throw (and the hook
 * swallowed it); release builds segfault on the first unmount.
 *
 * Start mounts and unmounts a component using useRiveList every CYCLE_MS, for
 * CYCLES rounds. Run it in a release build: expected is reaching
 * "done" without the app crashing.
 */

const CYCLES = 20;
const CYCLE_MS = 300;

function TeamList({ instance }: { instance: ViewModelInstance }) {
  const { length, error } = useRiveList('team', instance);
  return (
    <Text style={styles.list}>
      team length: {error ? `error: ${error.message}` : String(length)}
    </Text>
  );
}

export default function Issue407ListUnmount() {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/databinding_lists.riv')
  );
  const { instance } = useViewModelInstance(riveFile, {
    viewModelName: 'DevRel',
    async: true,
  });
  const [mounted, setMounted] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [status, setStatus] = useState('idle');
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = undefined;
  }, []);

  const start = useCallback(() => {
    stop();
    setCycle(0);
    setStatus('running');
    let n = 0;
    timer.current = setInterval(() => {
      n += 1;
      setMounted((m) => !m);
      setCycle(Math.ceil(n / 2));
      if (n >= CYCLES * 2) {
        stop();
        setStatus('done');
      }
    }, CYCLE_MS);
  }, [stop]);

  useEffect(() => {
    if (instance) start();
    return stop;
  }, [instance, start, stop]);

  return (
    <View style={styles.container}>
      <Text style={styles.status}>
        {status} · cycle {cycle}/{CYCLES}
      </Text>
      <View style={styles.box}>
        {mounted && instance ? <TeamList instance={instance} /> : null}
      </View>
      <View style={styles.buttons}>
        <Pressable style={styles.button} onPress={start}>
          <Text style={styles.buttonText}>Start</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => {
            stop();
            setStatus('stopped');
          }}
        >
          <Text style={styles.buttonText}>Stop</Text>
        </Pressable>
      </View>
    </View>
  );
}

Issue407ListUnmount.metadata = {
  name: 'Issue #407: useRiveList unmount',
  description:
    'Mount/unmount a useRiveList consumer; crashed in release builds',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  status: { fontSize: 16, fontFamily: 'monospace', marginBottom: 12 },
  box: {
    height: 60,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  list: { fontSize: 15 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
