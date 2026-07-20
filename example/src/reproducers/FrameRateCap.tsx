import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  RiveView,
  useRiveFile,
  Fit,
  type FrameRateRange,
  type RiveViewRef,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Manual verifier for the frameRate prop (issue #332).
 *
 * A looping animation renders at the display refresh rate by default; picking
 * a cap should make it visibly step at that rate while keeping wall-clock
 * playback speed (the loop takes the same time to complete). Pause should
 * stop per-frame rendering entirely.
 *
 * Only the experimental (default) backends honor the prop.
 */

type FrameRateOption = {
  label: string;
  value: number | FrameRateRange | undefined;
};

const OPTIONS: FrameRateOption[] = [
  { label: 'Uncapped', value: undefined },
  { label: '30 fps', value: 30 },
  { label: '15 fps', value: 15 },
  { label: '5 fps', value: 5 },
  {
    label: 'Range 10–20 (pref 15)',
    value: { minimum: 10, maximum: 20, preferred: 15 },
  },
];

export default function FrameRateCap() {
  const [optionIndex, setOptionIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(true);
  const viewRef = useRef<RiveViewRef | null>(null);
  const { riveFile } = useRiveFile(require('../../assets/rive/rewards.riv'));

  const selected = OPTIONS[optionIndex]!;

  const togglePaused = () => {
    if (paused) {
      viewRef.current?.play();
    } else {
      viewRef.current?.pause();
    }
    setPaused(!paused);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Frame Rate Cap</Text>
      <Text style={styles.subtitle}>
        Lower caps should visibly step but finish the loop in the same time.
      </Text>
      <View style={styles.buttonRow}>
        {OPTIONS.map((option, index) => (
          <Pressable
            key={option.label}
            testID={`framerate-${option.label}`}
            style={[
              styles.button,
              index === optionIndex && styles.buttonActive,
            ]}
            onPress={() => setOptionIndex(index)}
          >
            <Text
              style={[
                styles.buttonText,
                index === optionIndex && styles.buttonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          testID="framerate-pause"
          style={styles.button}
          onPress={togglePaused}
        >
          <Text style={styles.buttonText}>{paused ? 'Play' : 'Pause'}</Text>
        </Pressable>
        <Pressable
          testID="framerate-remount"
          style={styles.button}
          onPress={() => {
            setPaused(false);
            setMounted((m) => !m);
          }}
        >
          <Text style={styles.buttonText}>{mounted ? 'Unmount' : 'Mount'}</Text>
        </Pressable>
      </View>
      <View style={styles.riveContainer}>
        {mounted && riveFile ? (
          <RiveView
            file={riveFile}
            fit={Fit.Contain}
            autoPlay={true}
            frameRate={selected.value}
            hybridRef={{ f: (ref) => (viewRef.current = ref) }}
            style={styles.rive}
          />
        ) : (
          <Text style={styles.loading}>
            {mounted ? 'Loading…' : 'Unmounted'}
          </Text>
        )}
      </View>
    </View>
  );
}

FrameRateCap.metadata = {
  name: 'Frame Rate Cap',
  description:
    'frameRate prop: cap the render loop fps (experimental backends only)',
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
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 13,
  },
  buttonTextActive: {
    color: '#fff',
  },
  riveContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  rive: {
    flex: 1,
  },
  loading: {
    textAlign: 'center',
    color: '#666',
  },
});
