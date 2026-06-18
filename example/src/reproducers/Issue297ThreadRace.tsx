import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Fit,
  RiveView,
  useRiveFile,
  useViewModelInstance,
  type ViewModelInstance,
  type RiveFile,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Reproducer for https://github.com/rive-app/rive-nitro-react-native/issues/297
 *
 * Hypothesis: the Rive runtime (C++ core + the Obj-C RiveDataBindingViewModelInstance
 * wrappers, which keep NSMutableDictionary / std::unordered_map caches) is NOT
 * thread-safe and is meant to be driven from the main thread only. The Nitro layer
 * accesses it from THREE threads with no synchronization:
 *   - main render thread: state machine advance / afterUpdate reconfigure
 *   - JS thread: synchronous property accessors (numberProperty(...).value, etc.)
 *   - Swift cooperative pool: every Promise.async block (viewModelAsync, getValueAsync)
 *
 * This screen maximizes concurrent access from all three by spamming viewModelAsync
 * (off-main, mutates the nested-VM caches) and sync property reads (JS thread) while
 * the animation plays (main thread). Best run under Thread Sanitizer; otherwise expect
 * the malloc / NSDictionary-mutation crashes from the issue.
 */

const CONCURRENCY = 32;

function StressRunner({
  instance,
  file,
}: {
  instance: ViewModelInstance;
  file: RiveFile;
}) {
  const [running, setRunning] = useState(false);
  const [ops, setOps] = useState(0);
  const [errors, setErrors] = useState(0);
  // remount key: periodically forces afterUpdate -> configure(reload:) on main
  const [viewKey, setViewKey] = useState(0);

  const runningRef = useRef(false);
  const opsRef = useRef(0);
  const errRef = useRef(0);

  const tick = useCallback(async () => {
    // Off-main (Swift cooperative pool): nested view-model resolution mutates the
    // Obj-C NSMutableDictionary cache + the C++ ViewModelInstanceRuntime map.
    const asyncWork: Promise<unknown>[] = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      const path = i % 2 === 0 ? 'vm1' : 'vm2';
      asyncWork.push(
        instance
          .viewModelAsync(path)
          .then((nested) => {
            // Touch a property off the nested instance to keep the caches churning.
            nested?.stringProperty('name')?.getValueAsync();
          })
          .catch(() => {
            errRef.current += 1;
          })
      );
    }

    // JS thread: synchronous property accessors into the same objects. These run
    // sequentially on the JS thread, but they overlap the viewModelAsync work above
    // still resolving on the Swift cooperative pool — that cross-thread overlap is
    // the race.
    for (let i = 0; i < CONCURRENCY; i++) {
      try {
        const namePath = i % 2 === 0 ? 'vm1/name' : 'vm2/name';
        // sync read (JS thread)
        const v = instance.stringProperty(namePath)?.value;
        // sync write (JS thread)
        instance.stringProperty(namePath)?.set(`${v ?? ''}`.slice(0, 0) + 'x');
        // sync nested resolve (deprecated viewModel(), also off the same caches)
        instance.viewModel(i % 2 === 0 ? 'vm1' : 'vm2');
      } catch {
        errRef.current += 1;
      }
    }

    await Promise.all(asyncWork);
    opsRef.current += CONCURRENCY * 2;
  }, [instance]);

  const loop = useCallback(async () => {
    let n = 0;
    while (runningRef.current) {
      await tick();
      n += 1;
      // Every so often, remount the RiveView to force a reconfigure/cleanup on the
      // main thread overlapping with the in-flight async work (matches the crash
      // stacks where main is inside createViewFromViewModel / artboard instancing).
      if (n % 5 === 0) {
        setViewKey((k) => k + 1);
      }
      setOps(opsRef.current);
      setErrors(errRef.current);
      // Yield to the event loop so React can flush + the render thread can run.
      await new Promise((r) => setTimeout(r, 0));
    }
  }, [tick]);

  useEffect(() => {
    return () => {
      runningRef.current = false;
    };
  }, []);

  const onToggle = () => {
    if (runningRef.current) {
      runningRef.current = false;
      setRunning(false);
    } else {
      runningRef.current = true;
      setRunning(true);
      loop();
    }
  };

  return (
    <View style={styles.content}>
      <RiveView
        key={viewKey}
        style={styles.rive}
        autoPlay={true}
        dataBind={instance}
        fit={Fit.Contain}
        file={file}
      />
      <View style={styles.panel}>
        <Text style={styles.title}>Issue #297 — thread race stress</Text>
        <Text style={styles.stat}>ops: {ops}</Text>
        <Text style={styles.stat}>errors: {errors}</Text>
        <Text style={styles.stat}>remounts: {viewKey}</Text>
        <Button
          title={running ? 'Stop stress' : 'Start stress'}
          onPress={onToggle}
        />
      </View>
    </View>
  );
}

function WithViewModelSetup({ file }: { file: RiveFile }) {
  const { instance, error } = useViewModelInstance(file);

  if (error) {
    return <Text style={styles.errorText}>{error.message}</Text>;
  }
  if (!instance) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }
  return <StressRunner instance={instance} file={file} />;
}

export default function Issue297ThreadRace() {
  const { riveFile, isLoading, error } = useRiveFile(
    require('../../assets/rive/viewmodelproperty.riv')
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : riveFile ? (
        <WithViewModelSetup file={riveFile} />
      ) : (
        <Text style={styles.errorText}>
          {error?.message || 'Unexpected error'}
        </Text>
      )}
    </View>
  );
}

Issue297ThreadRace.metadata = {
  name: 'Issue #297 Thread Race',
  description:
    'Stresses viewModelAsync (off-main) + sync property access + remounts to ' +
    'reproduce the data race / heap corruption in #297. Best run under TSan.',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1 },
  rive: { flex: 1, width: '100%' },
  panel: { padding: 16, backgroundColor: '#fff', gap: 8 },
  title: { fontSize: 16, fontWeight: 'bold' },
  stat: { fontSize: 14, fontFamily: 'monospace', color: '#333' },
  errorText: { color: 'red', textAlign: 'center', padding: 20 },
});
