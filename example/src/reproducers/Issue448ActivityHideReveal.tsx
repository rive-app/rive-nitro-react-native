import * as React from 'react';
import {
  useCallback,
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import {
  Fit,
  RiveView,
  useRive,
  useRiveFile,
  useRiveNumber,
  useRiveTrigger,
  useViewModelInstance,
  type RiveFile,
  type RiveViewRef,
  type ViewModelInstance,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Issue #448: hiding and revealing a Rive subtree under <Activity> crashed
 * release builds; needs React 19.2+ (expo57-example), and the counters show when
 * the native objects are released.
 */

const SOURCE = require('../../assets/rive/databinding.riv');
const VM = 'Person';
const PATH = 'age';

type Counters = Record<
  | 'fileLoad'
  | 'fileDispose'
  | 'vmiCreate'
  | 'vmiDispose'
  | 'viewRef'
  | 'viewDispose',
  number
>;

const counters: Counters = {
  fileLoad: 0,
  fileDispose: 0,
  vmiCreate: 0,
  vmiDispose: 0,
  viewRef: 0,
  viewDispose: 0,
};
let lines: string[] = [];
let snapshot = { counters: { ...counters }, lines };
const listeners = new Set<() => void>();
const tracked = new WeakSet<object>();

// Queued because log() also runs during render.
function publish() {
  queueMicrotask(() => {
    snapshot = { counters: { ...counters }, lines };
    listeners.forEach((l) => l());
  });
}

function log(line: string) {
  console.log(`[448] ${line}`);
  lines = [...lines.slice(-13), line];
  publish();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function trackDispose(
  obj: object & { dispose(): void },
  created: keyof Counters,
  disposed: keyof Counters
) {
  if (tracked.has(obj)) return;
  tracked.add(obj);
  counters[created] += 1;
  log(`${created} #${counters[created]}`);
  const dispose = obj.dispose;
  // Nitro's dispose is read-only, so it can't be assigned.
  Object.defineProperty(obj, 'dispose', {
    configurable: true,
    value: () => {
      counters[disposed] += 1;
      log(`${disposed} #${counters[disposed]}`);
      return dispose.call(obj);
    },
  });
}

function EffectProbe() {
  useInsertionEffect(() => {
    log('effects: insertion+');
    return () => log('effects: insertion-');
  }, []);
  useLayoutEffect(() => {
    log('effects: layout+');
    return () => log('effects: layout-');
  }, []);
  useEffect(() => {
    log('effects: passive+');
    return () => log('effects: passive-');
  }, []);
  return null;
}

type Handles = {
  instance?: ViewModelInstance | null;
  view?: RiveViewRef | null;
};

function AgeLabel({ instance }: { instance: ViewModelInstance }) {
  const { value, setValue } = useRiveNumber(PATH, instance);
  useRiveTrigger('jump', instance);
  const setAge = useRef(setValue);
  setAge.current = setValue;
  useEffect(() => {
    globalActions.setAge = (v) => setAge.current(v);
    return () => {
      globalActions.setAge = undefined;
    };
  }, []);
  return <Text style={styles.age}>age: {String(value)}</Text>;
}

const globalActions: { setAge?: (v: number) => void } = {};

function Subject({
  outerFile,
  asyncInstance,
  withProperty,
  handles,
}: {
  outerFile: RiveFile | undefined;
  asyncInstance: boolean;
  withProperty: boolean;
  handles: { current: Handles };
}) {
  const inner = useRiveFile(outerFile ? undefined : SOURCE);
  const riveFile = outerFile ?? inner.riveFile;
  if (riveFile) trackDispose(riveFile, 'fileLoad', 'fileDispose');

  const params = useMemo(
    () => ({ viewModelName: VM, async: asyncInstance }),
    [asyncInstance]
  );
  const { instance } = useViewModelInstance(
    riveFile,
    params as { viewModelName: string; async: true }
  );
  if (instance) trackDispose(instance, 'vmiCreate', 'vmiDispose');

  const { riveViewRef, setHybridRef } = useRive();
  const forward = setHybridRef.f;
  const hybridRef = useMemo(
    () => ({
      f: (ref: RiveViewRef | null) => {
        if (ref) trackDispose(ref, 'viewRef', 'viewDispose');
        forward(ref);
      },
    }),
    [forward]
  );

  useEffect(() => {
    handles.current.instance = instance;
    handles.current.view = riveViewRef;
  });

  // An effect keyed on the view runs again on reveal, like the consumer effect
  // in the issue that calls play()/pause().
  useEffect(() => {
    log(`view effect: typeof play=${typeof riveViewRef?.play}`);
    if (!riveViewRef) return;
    try {
      riveViewRef.play().then(
        () => log('effect play: ok'),
        (e: unknown) => log(`effect play: rejected ${String(e)}`)
      );
    } catch (e) {
      log(`effect play: threw ${String(e)}`);
    }
  }, [riveViewRef]);

  return (
    <View style={styles.subject}>
      <EffectProbe />
      {riveFile && instance ? (
        <RiveView
          style={styles.rive}
          file={riveFile}
          dataBind={instance}
          fit={Fit.Contain}
          hybridRef={hybridRef}
        />
      ) : (
        <Text>loading</Text>
      )}
      {withProperty && instance ? <AgeLabel instance={instance} /> : null}
    </View>
  );
}

function SharedFile({ children }: { children: (file: RiveFile) => ReactNode }) {
  const { riveFile } = useRiveFile(SOURCE);
  if (riveFile) trackDispose(riveFile, 'fileLoad', 'fileDispose');
  return riveFile ? children(riveFile) : <Text>loading shared file</Text>;
}

function Button({
  id,
  label,
  onPress,
  on,
}: {
  id: string;
  label: string;
  onPress: () => void;
  on?: boolean;
}) {
  return (
    <Pressable
      testID={id}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.button, on && styles.buttonOn]}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const Activity = (
  React as unknown as {
    Activity?: ComponentType<{
      mode: 'visible' | 'hidden';
      children: ReactNode;
    }>;
  }
).Activity;

export default function Issue448ActivityHideReveal() {
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [count, setCount] = useState(1);
  const [withProperty, setWithProperty] = useState(false);
  const [asyncInstance, setAsyncInstance] = useState(true);
  const [fileOutside, setFileOutside] = useState(false);
  const handles = useRef<Handles>({});
  const probe = useSyncExternalStore(subscribe, () => snapshot);

  const guarded = useCallback((name: string, call: () => unknown) => {
    try {
      const result = call();
      Promise.resolve(result).then(
        () => log(`${name}: ok`),
        (e: unknown) => log(`${name}: rejected ${String(e)}`)
      );
    } catch (e) {
      log(`${name}: threw ${String(e)}`);
    }
  }, []);

  const callInstance = () =>
    guarded('call instance', () => {
      const { instance } = handles.current;
      return instance?.numberProperty(PATH)?.set(Date.now() % 100);
    });

  // A raw native call: callDispose doesn't wrap it, and a segfault skips catch.
  const propertyRef = useRef<ReturnType<
    ViewModelInstance['numberProperty']
  > | null>(null);
  const grabProperty = () =>
    guarded('grab property', () => {
      propertyRef.current = handles.current.instance?.numberProperty(PATH);
    });
  const callProperty = () =>
    guarded('call property', () => propertyRef.current?.set(7));

  const body = (outerFile?: RiveFile) =>
    Array.from({ length: count }, (_, i) => (
      <Subject
        key={`${i}-${String(asyncInstance)}-${String(withProperty)}`}
        outerFile={outerFile}
        asyncInstance={asyncInstance}
        withProperty={withProperty}
        handles={handles}
      />
    ));

  if (!Activity) {
    return (
      <View style={styles.container}>
        <Text>Needs React 19.2+: this app has no {'<Activity>'} export.</Text>
      </View>
    );
  }

  const activity = (outerFile?: RiveFile) => (
    <Activity mode={hidden ? 'hidden' : 'visible'}>
      <View>{body(outerFile)}</View>
    </Activity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.status} testID="issue448-status">
        {`react ${React.version} · ${mounted ? 'mounted' : 'unmounted'} · ${hidden ? 'hidden' : 'visible'} · n=${count}\n`}
        {Object.entries(probe.counters)
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')}
      </Text>
      <View style={styles.row}>
        <Button
          id="mount"
          label="Mount"
          onPress={() => {
            setHidden(false);
            setMounted(true);
          }}
        />
        <Button id="hide" label="Hide" onPress={() => setHidden(true)} />
        <Button id="reveal" label="Reveal" onPress={() => setHidden(false)} />
        <Button
          id="unmount"
          label="Unmount"
          onPress={() => setMounted(false)}
        />
      </View>
      <View style={styles.row}>
        <Button id="call-instance" label="Call inst" onPress={callInstance} />
        <Button id="grab-property" label="Grab prop" onPress={grabProperty} />
        <Button id="call-property" label="Call prop" onPress={callProperty} />
        <Button
          id="play"
          label="Play"
          onPress={() => guarded('play', () => handles.current.view?.play())}
        />
        <Button
          id="pause"
          label="Pause"
          onPress={() => guarded('pause', () => handles.current.view?.pause())}
        />
      </View>
      <View style={styles.row}>
        <Button
          id="set-age"
          label="Age 42"
          onPress={() => globalActions.setAge?.(42)}
        />
        <Button
          id="with-property"
          label="useRiveNumber"
          on={withProperty}
          onPress={() => setWithProperty((v) => !v)}
        />
        <Button
          id="async"
          label="async"
          on={asyncInstance}
          onPress={() => setAsyncInstance((v) => !v)}
        />
        <Button
          id="file-outside"
          label="File outside"
          on={fileOutside}
          onPress={() => setFileOutside((v) => !v)}
        />
        <Button
          id="many"
          label="n=8"
          on={count > 1}
          onPress={() => setCount((c) => (c > 1 ? 1 : 8))}
        />
        <Button
          id="gc"
          label="GC"
          onPress={() => {
            const { gc } = globalThis as { gc?: () => void };
            gc?.();
            log(`gc ${gc ? 'ran' : 'unavailable'}`);
          }}
        />
        <Button
          id="churn"
          label="Churn"
          onPress={() => {
            // Forces Hermes collections where gc() isn't exposed.
            for (let i = 0; i < 400; i += 1) {
              new Array(50_000).fill({ i });
            }
            log('churned');
          }}
        />
      </View>
      {mounted ? (
        fileOutside ? (
          <SharedFile>{activity}</SharedFile>
        ) : (
          activity()
        )
      ) : null}
      <Text style={styles.log} testID="issue448-log">
        {probe.lines.join('\n')}
      </Text>
    </ScrollView>
  );
}

Issue448ActivityHideReveal.metadata = {
  name: 'Issue #448: Activity hide/reveal',
  description:
    'Hide and reveal a Rive subtree under <Activity>; crashed release builds',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 12 },
  status: { fontFamily: 'monospace', fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonOn: { backgroundColor: '#34C759' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  subject: { borderWidth: 1, borderColor: '#ddd', marginVertical: 4 },
  rive: { height: 160 },
  age: { fontSize: 14, padding: 4 },
  log: { fontFamily: 'monospace', fontSize: 11, marginTop: 8 },
});
