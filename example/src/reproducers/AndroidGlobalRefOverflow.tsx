/* eslint-disable @typescript-eslint/no-deprecated -- the repro needs the sync API */
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
 * Manual reproducer for the Android JNI global-reference overflow.
 *
 * Every view-model property/instance accessor returns a fresh HybridObject that pins one
 * JNI global reference. On Android the global reference table is capped at 51200; without
 * the `memorySize` hint Hermes can't see how heavy these tiny JS objects are, so it never
 * collects them under churn and the process aborts with
 * `JNI ERROR (app bug): global reference table overflow`.
 *
 * Toggle the stress: on an unfixed build the app dies within seconds; on a fixed build the
 * op counter climbs indefinitely. (No-op on iOS — there is no JNI global reference table.)
 */
const CONCURRENCY = 64;

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

  const runningRef = useRef(false);
  const opsRef = useRef(0);
  const errRef = useRef(0);

  const tick = useCallback(async () => {
    const asyncWork: Promise<unknown>[] = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      const path = i % 2 === 0 ? 'vm1' : 'vm2';
      asyncWork.push(
        instance
          .viewModelAsync(path)
          .then((nested) => nested?.stringProperty('name')?.getValueAsync())
          .catch(() => {
            errRef.current += 1;
          })
      );
    }

    for (let i = 0; i < CONCURRENCY; i++) {
      try {
        const namePath = i % 2 === 0 ? 'vm1/name' : 'vm2/name';
        const prop = instance.stringProperty(namePath);
        prop?.set(`${prop?.value ?? ''}`.slice(0, 0) + 'x');
        instance.viewModel(i % 2 === 0 ? 'vm1' : 'vm2');
      } catch {
        errRef.current += 1;
      }
    }

    await Promise.all(asyncWork);
    opsRef.current += CONCURRENCY * 2;
  }, [instance]);

  const loop = useCallback(async () => {
    while (runningRef.current) {
      await tick();
      setOps(opsRef.current);
      setErrors(errRef.current);
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
        style={styles.rive}
        autoPlay={true}
        dataBind={instance}
        fit={Fit.Contain}
        file={file}
      />
      <View style={styles.panel}>
        <Text style={styles.title}>Android JNI global-ref overflow</Text>
        <Text style={styles.stat}>property accessors: {ops}</Text>
        <Text style={styles.stat}>errors: {errors}</Text>
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

export default function AndroidGlobalRefOverflow() {
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

AndroidGlobalRefOverflow.metadata = {
  name: 'Android JNI Global-Ref Overflow',
  description:
    'Churns view-model property/instance accessors to exhaust the Android JNI global ' +
    'reference table (cap 51200). Crashes within seconds without the memorySize fix; ' +
    'runs indefinitely with it.',
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
