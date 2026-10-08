import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Fit,
  RiveView,
  useRiveFile,
  useRiveNumber,
  useViewModelInstance,
  type ViewModelInstance,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Issue #414: a script that caches context:viewModel() in init must see the
 * instance passed through dataBind, not the file's default instance.
 *
 * The host seeds seed = 42 before mounting. The script sets isReady = 1 in
 * init and copies seed into observedSeed every frame, drawing green when it
 * sees 42 and red otherwise. Expected: 42 / 1 / 42 and a green square.
 */

function Probe({ instance }: { instance: ViewModelInstance }) {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/script_binding_probe.riv')
  );
  const { value: seed } = useRiveNumber('seed', instance);
  const { value: isReady } = useRiveNumber('isReady', instance);
  const { value: observedSeed } = useRiveNumber('observedSeed', instance);
  const pass = seed === 42 && isReady === 1 && observedSeed === 42;

  return (
    <>
      <Text style={styles.values} testID="issue414-values">
        seed={String(seed)} isReady={String(isReady)} observedSeed=
        {String(observedSeed)}
      </Text>
      <Text style={[styles.verdict, pass ? styles.pass : styles.fail]}>
        {pass ? 'PASS' : 'FAIL (script bound to another instance)'}
      </Text>
      {riveFile ? (
        <RiveView
          file={riveFile}
          artboardName="Binding Probe"
          stateMachineName="Main"
          dataBind={instance}
          autoPlay
          fit={Fit.Layout}
          style={styles.rive}
        />
      ) : null}
    </>
  );
}

export default function Issue414ScriptBinding() {
  const { riveFile, error } = useRiveFile(
    require('../../assets/rive/script_binding_probe.riv')
  );
  const onInit = useCallback((vmi: ViewModelInstance) => {
    vmi.numberProperty('seed')?.set(42);
  }, []);
  const { instance } = useViewModelInstance(riveFile, {
    viewModelName: 'ProbeModel',
    async: true,
    onInit,
  });
  const [generation, setGeneration] = useState(0);

  return (
    <View style={styles.container}>
      {error ? <Text>{String(error)}</Text> : null}
      {instance ? (
        <Probe key={generation} instance={instance} />
      ) : (
        <Text>Loading…</Text>
      )}
      <Pressable
        style={styles.button}
        onPress={() => setGeneration((g) => g + 1)}
      >
        <Text style={styles.buttonText}>Remount</Text>
      </Pressable>
    </View>
  );
}

Issue414ScriptBinding.metadata = {
  name: 'Issue #414: script view model binding',
  description: 'Scripts cached the default instance instead of dataBind',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  values: { fontSize: 15, fontFamily: 'monospace' },
  verdict: { fontSize: 16, fontWeight: '700', marginVertical: 8 },
  pass: { color: '#2e7d32' },
  fail: { color: '#d32f2f' },
  rive: { width: 160, height: 160 },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
