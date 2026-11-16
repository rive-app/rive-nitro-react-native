import { Activity, useEffect, useMemo, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import {
  Fit,
  RiveView,
  useRive,
  useRiveFile,
  useRiveNumber,
  useViewModelInstance,
  type ViewModelInstance,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Issue #448: hiding and revealing a Rive subtree under <Activity> crashed
 * release builds. Async: Hide, Reveal, Play threw "play is undefined". Sync +
 * useRiveNumber: Age 42, Hide, Reveal segfaulted. Needs React 19.2+
 * (expo57-example).
 */

const SOURCE = require('../../assets/rive/databinding.riv');
// Created / disposed per kind of native object.
const counts = { file: [0, 0], vmi: [0, 0], view: [0, 0] };
const tracked = new WeakSet<object>();
let notify = () => {};

function track(obj: { dispose(): void }, kind: keyof typeof counts) {
  if (tracked.has(obj)) return;
  tracked.add(obj);
  counts[kind][0]! += 1;
  queueMicrotask(notify);
  const dispose = obj.dispose;
  // Nitro's dispose is read-only, so it can't be assigned.
  Object.defineProperty(obj, 'dispose', {
    configurable: true,
    value: () => {
      counts[kind][1]! += 1;
      queueMicrotask(notify);
      return dispose.call(obj);
    },
  });
}

const actions: { play?: () => unknown; setAge?: (v: number) => void } = {};

function Age({ instance }: { instance: ViewModelInstance }) {
  const { value, setValue } = useRiveNumber('age', instance);
  useEffect(() => {
    actions.setAge = setValue;
  });
  return <Text testID="age">age: {String(value)}</Text>;
}

function Subject({ sync }: { sync: boolean }) {
  const { riveFile } = useRiveFile(SOURCE);
  if (riveFile) track(riveFile, 'file');
  const params = useMemo(
    () => ({ viewModelName: 'Person', async: !sync }),
    [sync]
  );
  const { instance } = useViewModelInstance(
    riveFile,
    params as { viewModelName: string; async: true }
  );
  if (instance) track(instance, 'vmi');
  const { riveViewRef, setHybridRef } = useRive();
  useEffect(() => {
    if (riveViewRef) track(riveViewRef, 'view');
    actions.play = () => riveViewRef?.play();
  });

  if (!riveFile || !instance) return <Text>loading</Text>;
  return (
    <View>
      <RiveView
        style={styles.rive}
        file={riveFile}
        dataBind={instance}
        fit={Fit.Contain}
        hybridRef={setHybridRef}
      />
      {sync ? <Age instance={instance} /> : null}
    </View>
  );
}

export default function Issue448ActivityHideReveal() {
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [sync, setSync] = useState(false);
  const toggleSync = () => setSync((s) => !s);
  const [result, setResult] = useState('');
  const [, rerender] = useState(0);
  useEffect(() => {
    notify = () => rerender((n) => n + 1);
  }, []);

  // Undefined before React 19.2, e.g. in the bare example app.
  if (!Activity) return <Text>Needs React 19.2+ for {'<Activity>'}.</Text>;

  const run = (name: string, call: () => unknown) =>
    Promise.resolve()
      .then(call)
      .then(
        () => setResult(`${name}: ok`),
        (e: unknown) => setResult(`${name}: ${String(e)}`)
      );
  const button = (id: string, title: string, onPress: () => void) => (
    <Button testID={id} title={title} onPress={onPress} />
  );

  return (
    <View style={styles.container}>
      <Text testID="status" style={styles.mono}>
        {`${mounted ? 'mounted' : 'unmounted'} · ${hidden ? 'hidden' : 'visible'} · ${sync ? 'sync+useRiveNumber' : 'async'}\n`}
        {Object.entries(counts)
          .map(([k, [made, freed]]) => `${k}=${made}/${freed}`)
          .join(' ')}
        {`\n${result}`}
      </Text>
      <View style={styles.row}>
        {button('mount', 'Mount', () => {
          setHidden(false);
          setMounted(true);
        })}
        {button('hide', 'Hide', () => setHidden(true))}
        {button('reveal', 'Reveal', () => setHidden(false))}
        {button('unmount', 'Unmount', () => setMounted(false))}
      </View>
      <View style={styles.row}>
        {button('sync', sync ? 'Use async' : 'Use sync', toggleSync)}
        {button('play', 'Play', () => run('play', () => actions.play?.()))}
        {button('age', 'Age 42', () => run('age', () => actions.setAge?.(42)))}
      </View>
      {mounted ? (
        <Activity mode={hidden ? 'hidden' : 'visible'}>
          <Subject key={String(sync)} sync={sync} />
        </Activity>
      ) : null}
    </View>
  );
}

Issue448ActivityHideReveal.metadata = {
  name: 'Issue #448: Activity hide/reveal',
  description: 'Hide and reveal under <Activity>; crashed release builds',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 12 },
  mono: { fontFamily: 'monospace', fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  rive: { height: 200 },
});
