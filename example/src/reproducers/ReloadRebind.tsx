import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  RiveView,
  useRiveFile,
  useRiveNumber,
  useViewModelInstance,
  Fit,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Reproducer for review finding H3 (Android experimental backend).
 *
 * Changing artboardName / stateMachineName / file triggers a reload that
 * creates a brand-new state machine, but applyDataBinding only runs when the
 * dataBind prop itself changed — so the new state machine is never bound.
 *
 * Steps: press "Health 10 / 100" and watch the health bar respond. Then press
 * "Reload artboard" (sets artboardName explicitly — same artboard, forces a
 * reload). Broken: the health buttons stop affecting the view (state machine
 * unbound, graphics frozen at defaults). Fixed: they keep working.
 */

export default function ReloadRebind() {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/quick_start.riv')
  );
  const { instance: viewModelInstance } = useViewModelInstance(riveFile, {
    onInit: (vmi) => vmi.numberProperty('health')!.set(50),
  });
  const { setValue: setHealth } = useRiveNumber('health', viewModelInstance);
  const [artboardName, setArtboardName] = useState<string | undefined>(
    undefined
  );
  const [status, setStatus] = useState('initial mount (no explicit artboard)');

  const reload = async () => {
    if (!riveFile) return;
    const names = await riveFile.getArtboardNamesAsync();
    setArtboardName(names[0]);
    setStatus(
      `reloaded with artboardName="${names[0]}" — do the health buttons still work?`
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reload Re-bind</Text>
      <Text style={styles.subtitle}>
        After a reload the state machine must be re-bound to the data-binding
        instance
      </Text>
      <View style={styles.row}>
        <Pressable style={styles.button} onPress={() => setHealth(10)}>
          <Text style={styles.buttonText}>Health 10</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => setHealth(100)}>
          <Text style={styles.buttonText}>Health 100</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.reloadButton]}
          onPress={reload}
        >
          <Text style={styles.buttonText}>Reload artboard</Text>
        </Pressable>
      </View>
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>{status}</Text>
      </View>
      <View style={styles.riveContainer}>
        {riveFile && viewModelInstance && (
          <RiveView
            file={riveFile}
            artboardName={artboardName}
            fit={Fit.Contain}
            style={styles.rive}
            autoPlay={true}
            dataBind={viewModelInstance}
          />
        )}
      </View>
    </View>
  );
}

ReloadRebind.metadata = {
  name: 'Reload Re-bind',
  description:
    'Experimental backend: data binding must be re-applied when the view reloads (artboard/state-machine/file change)',
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
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  reloadButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
