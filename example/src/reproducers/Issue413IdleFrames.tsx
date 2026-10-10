import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  RiveView,
  useRiveFile,
  useViewModelInstance,
  Fit,
  type RiveViewRef,
  type ViewModelInstance,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Reproducer for issue #413: the new Android backend kept a Choreographer
 * frame callback running every vsync forever, even paused, settled,
 * unmounted or backgrounded.
 *
 * Ticker's `phase` changes on every state machine advance and is only
 * delivered while the command queue is polled, so "phase updates/s" is a live
 * count of advances: one per display frame while playing, 0 when paused,
 * unmounted or in the background. Probe checks that a JS write still reaches
 * a settled state machine: "Set input = 1" must turn output from 10 into 77.
 *
 * Frame callbacks themselves are counted with (app in background):
 *   adb shell atrace -t 10 -a rive.example view \
 *     | grep -c "B|$(adb shell pidof rive.example)|Choreographer#doFrame"
 * Broken: one per vsync once any Rive file has loaded. Fixed: 0.
 */

const SETTLE_PROBE = require('../../assets/rive/settle_probe.riv');

function useListenerCount(
  instance: ViewModelInstance | null | undefined,
  name: string
) {
  const count = useRef(0);
  const latest = useRef<number | null>(null);
  useEffect(() => {
    const prop = instance?.numberProperty(name);
    if (!prop) return;
    return prop.addListener((value) => {
      count.current += 1;
      latest.current = value;
    });
  }, [instance, name]);
  return { count, latest };
}

export default function Issue413IdleFrames() {
  const { riveFile } = useRiveFile(SETTLE_PROBE);
  const { instance: ticker } = useViewModelInstance(riveFile, {
    async: true,
    artboardName: 'Ticker',
  });
  const { instance: probe } = useViewModelInstance(riveFile, {
    async: true,
    artboardName: 'Probe',
  });

  const [mounted, setMounted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [sampling, setSampling] = useState(true);
  const [rate, setRate] = useState(0);
  const [output, setOutput] = useState<number | null>(null);
  const tickerRef = useRef<RiveViewRef | null>(null);

  const phase = useListenerCount(ticker, 'phase');
  const probeOutput = useListenerCount(probe, 'output');

  useEffect(() => {
    if (!sampling) return;
    let last = phase.count.current;
    const id = setInterval(() => {
      setRate(phase.count.current - last);
      last = phase.count.current;
      setOutput(probeOutput.latest.current);
    }, 1000);
    return () => clearInterval(id);
  }, [sampling, phase.count, probeOutput.latest]);

  const togglePaused = () => {
    if (paused) {
      tickerRef.current?.play();
    } else {
      tickerRef.current?.pause();
    }
    setPaused(!paused);
  };

  const setInput = (value: number) => {
    probe?.numberProperty('input')?.set(value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Idle frame callbacks (#413)</Text>
      <Text style={styles.subtitle}>
        Pause, unmount or background the app: updates/s should drop to 0.
      </Text>
      <View style={styles.buttonRow}>
        <Pressable style={styles.button} onPress={togglePaused}>
          <Text style={styles.buttonText}>{paused ? 'Play' : 'Pause'}</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => {
            setPaused(false);
            setMounted((m) => !m);
          }}
        >
          <Text style={styles.buttonText}>{mounted ? 'Unmount' : 'Mount'}</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => setSampling((s) => !s)}>
          <Text style={styles.buttonText}>
            {sampling ? 'Stop counter' : 'Start counter'}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.stat} testID="issue413-rate">
        Ticker phase updates/s: {sampling ? rate : '–'}
      </Text>
      <View style={styles.riveContainer}>
        {mounted && riveFile && ticker ? (
          <RiveView
            file={riveFile}
            artboardName="Ticker"
            dataBind={ticker}
            fit={Fit.Contain}
            autoPlay={true}
            hybridRef={{ f: (ref) => (tickerRef.current = ref) }}
            style={styles.rive}
          />
        ) : (
          <Text style={styles.loading}>
            {mounted ? 'Loading…' : 'Unmounted'}
          </Text>
        )}
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={styles.button} onPress={() => setInput(1)}>
          <Text style={styles.buttonText}>Set input = 1</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => setInput(0)}>
          <Text style={styles.buttonText}>Set input = 0</Text>
        </Pressable>
      </View>
      <Text style={styles.stat} testID="issue413-output">
        Probe output: {output ?? '–'} (10 at rest, 77 after input = 1)
      </Text>
      <View style={styles.riveContainer}>
        {mounted && riveFile && probe ? (
          <RiveView
            file={riveFile}
            artboardName="Probe"
            dataBind={probe}
            fit={Fit.Contain}
            autoPlay={true}
            style={styles.rive}
          />
        ) : null}
      </View>
    </View>
  );
}

Issue413IdleFrames.metadata = {
  name: 'Idle frame callbacks (#413)',
  description:
    'Live advance counter for paused, settled, unmounted and backgrounded views',
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
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  buttonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 13,
  },
  stat: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    marginVertical: 4,
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
