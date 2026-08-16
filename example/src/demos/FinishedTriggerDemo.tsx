import { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import {
  RiveView,
  useRive,
  useRiveFile,
  useRiveTrigger,
  useViewModelInstance,
  Fit,
} from '@rive-app/react-native';
import type { Metadata } from '../shared/metadata';

// One-shot animation whose state machine fires the 'finished' view-model
// trigger via an exit-time transition action — the data-binding way to react
// to playback completing (e.g. navigate away from a splash screen).
export default function FinishedTriggerDemo() {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/finished_trigger.riv')
  );
  const { riveViewRef, setHybridRef } = useRive();
  const { instance } = useViewModelInstance(riveFile, { async: true });

  const [runId, setRunId] = useState(1);
  const [fireLog, setFireLog] = useState<string[]>([]);
  const mountedAt = useRef(Date.now());

  useRiveTrigger('finished', instance, {
    onTrigger: () => {
      const elapsed = Date.now() - mountedAt.current;
      setFireLog((log) => [
        `#${log.length + 1} fired ${elapsed} ms after (re)mount`,
        ...log,
      ]);
    },
  });

  const replay = () => {
    mountedAt.current = Date.now();
    setRunId((id) => id + 1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.riveBox}>
        {riveFile && instance && (
          <RiveView
            key={runId}
            hybridRef={setHybridRef}
            file={riveFile}
            dataBind={instance}
            fit={Fit.Contain}
            autoPlay={true}
            style={styles.rive}
          />
        )}
      </View>

      <Text style={styles.status}>
        {fireLog.length === 0
          ? 'Playing… waiting for finished trigger'
          : `finished fired ${fireLog.length}×`}
      </Text>

      <View style={styles.buttons}>
        <Pressable style={styles.button} onPress={replay}>
          <Text style={styles.buttonText}>Replay (remount)</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => riveViewRef?.pause()}>
          <Text style={styles.buttonText}>Pause</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => riveViewRef?.play()}>
          <Text style={styles.buttonText}>Play</Text>
        </Pressable>
      </View>

      <View style={styles.log}>
        {fireLog.map((entry) => (
          <Text key={entry} style={styles.logEntry}>
            {entry}
          </Text>
        ))}
      </View>
    </View>
  );
}

FinishedTriggerDemo.metadata = {
  name: 'Finished Trigger',
  description:
    'View-model trigger fired when a one-shot animation completes (onStop replacement)',
  order: 50,
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  riveBox: {
    height: 260,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f2f2f7',
  },
  rive: {
    flex: 1,
  },
  status: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  button: {
    backgroundColor: '#007aff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  log: {
    marginTop: 16,
  },
  logEntry: {
    fontFamily: 'Menlo',
    fontSize: 13,
    paddingVertical: 2,
  },
});
