import { Activity, useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import {
  RiveView,
  useRive,
  useRiveFile,
  type RiveViewRef,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Issue #473: on iOS, Fabric creates a new native view when <Activity>
 * reveals a RiveView, and RiveView disposes the old one. useRive kept
 * returning the disposed view until the new one was ready, so an effect that
 * re-ran in that window called play() on it and threw "undefined is not a
 * function". Mount, Hide, Reveal: onDisposed must stay 0. "Fast cycles" hides
 * and reveals in quick succession. Needs React 19.2+ (expo57-example).
 */

const SOURCE = require('../../assets/rive/quick_start.riv');

const ids = new WeakMap<object, number>();
const disposed = new WeakSet<object>();
let nextId = 1;
let current: RiveViewRef | null = null;
let published: RiveViewRef | null | undefined;
let arrivedAt = 0;
const stats = {
  nodes: 0,
  effects: 0,
  onDisposed: 0,
  threw: 0,
  lastError: '',
};
let notify = () => {};

function idOf(view: RiveViewRef) {
  let id = ids.get(view);
  if (id === undefined) {
    id = nextId++;
    ids.set(view, id);
    const dispose = view.dispose;
    // Nitro's dispose is read-only, so it can't be assigned.
    Object.defineProperty(view, 'dispose', {
      configurable: true,
      value: () => {
        disposed.add(view);
        console.log(`[473] view#${id} disposed`);
        return dispose.call(view);
      },
    });
  }
  return id;
}

function describe(view: RiveViewRef | null | undefined) {
  if (!view) return String(view);
  return `view#${idOf(view)}${disposed.has(view) ? ' (disposed)' : ''}`;
}

// Calls play() the way an app would and records what a call on a disposed
// view does.
function callPlay(view: RiveViewRef | null | undefined, from: string) {
  const label = `${from}: play on ${describe(view)}`;
  if (view && disposed.has(view)) stats.onDisposed += 1;
  try {
    view?.play().then(
      () => console.log(`[473] ${label}: resolved`),
      (e: unknown) => {
        stats.threw += 1;
        stats.lastError = `${label} rejected: ${String(e)}`;
        console.log(`[473] ${stats.lastError}`);
        notify();
      }
    );
  } catch (e) {
    stats.threw += 1;
    stats.lastError = `${label} threw: ${String(e)}`;
    console.log(`[473] ${stats.lastError}`);
  }
  queueMicrotask(notify);
}

function Ka() {
  const { riveFile } = useRiveFile(SOURCE);
  const { riveViewRef, setHybridRef } = useRive();
  const [arrivals, setArrivals] = useState(0);
  const [hybridRef] = useState(() => ({
    f: (node: RiveViewRef | null) => {
      // RiveView passes a new hybridRef each render, so Nitro calls this
      // again with the same node.
      if (node === current) return;
      stats.nodes += 1;
      current = node;
      arrivedAt = Date.now();
      console.log(`[473] node arrived: ${describe(node)}`);
      setHybridRef.f(node);
      setArrivals((n) => n + 1);
    },
  }));

  // The issue's effect.
  useEffect(() => {
    stats.effects += 1;
    published = riveViewRef;
    if (riveViewRef && riveViewRef === current && arrivedAt) {
      console.log(`[473] new view published after ${Date.now() - arrivedAt}ms`);
      arrivedAt = 0;
    }
    console.log(
      `[473] effect: riveViewRef=${describe(riveViewRef)} current=${describe(current)}`
    );
    callPlay(riveViewRef, 'effect');
  }, [riveViewRef]);

  // Stands in for any effect that re-runs on unrelated state right after the
  // reveal, before the new view is ready.
  useEffect(() => {
    if (arrivals > 1) callPlay(riveViewRef, 'rerender');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivals]);

  if (!riveFile) return <Text>loading</Text>;
  return (
    <RiveView
      style={styles.rive}
      file={riveFile}
      hybridRef={hybridRef}
      autoPlay={false}
    />
  );
}

// Reads module-level stats, which the React Compiler would memoize away.
function Status({ state }: { state: string; tick: number }) {
  'use no memo';
  return (
    <Text testID="status" style={styles.mono}>
      {`nodes=${stats.nodes} effects=${stats.effects} onDisposed=${stats.onDisposed} threw=${stats.threw}\n`}
      {`${state} · current=${describe(current)} riveViewRef=${describe(published)}\n`}
      {stats.lastError}
    </Text>
  );
}

export default function Issue473StaleViewRef() {
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [tick, rerender] = useState(0);
  useEffect(() => {
    notify = () => rerender((n) => n + 1);
  }, []);

  if (!Activity) return <Text>Needs React 19.2+ for {'<Activity>'}.</Text>;

  const fastCycles = async () => {
    for (let i = 0; i < 5; i++) {
      setHidden(true);
      await new Promise((r) => setTimeout(r, 0));
      setHidden(false);
      await new Promise((r) => setTimeout(r, 0));
    }
  };
  const button = (id: string, title: string, onPress: () => void) => (
    <Button testID={id} title={title} onPress={onPress} />
  );

  return (
    <View style={styles.container}>
      <Status
        tick={tick}
        state={`${mounted ? 'mounted' : 'unmounted'} · ${hidden ? 'hidden' : 'visible'}`}
      />
      <View style={styles.row}>
        {button('mount', 'Mount', () => {
          setHidden(false);
          setMounted(true);
        })}
        {button('hide', 'Hide', () => setHidden(true))}
        {button('reveal', 'Reveal', () => setHidden(false))}
        {button('unmount', 'Unmount', () => setMounted(false))}
        {button('cycles', 'Fast cycles', fastCycles)}
      </View>
      {mounted ? (
        <Activity mode={hidden ? 'hidden' : 'visible'}>
          <Ka />
        </Activity>
      ) : null}
    </View>
  );
}

Issue473StaleViewRef.metadata = {
  name: 'Issue #473: stale riveViewRef after reveal',
  description: 'useRive returned the disposed view after an <Activity> reveal',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 12 },
  mono: { fontFamily: 'monospace', fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  rive: { height: 200 },
});
