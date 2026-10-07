import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  Fit,
  RiveView,
  RiveFonts,
  useRive,
  useRiveFile,
  useRiveString,
  useViewModelInstance,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Issue #369: on Android, rive-android keeps the fallback-font picker only in a
 * WeakReference. If a GC runs between setFallbackFonts() and the first text
 * that needs a fallback, the picker is gone and non-Latin text renders blank.
 *
 * Start sets Kanit (Thai) as the fallback font, loads it again CHURN_LOADS
 * times to make the Java heap collect, then mounts a view showing Thai text.
 * Expected: the Thai text renders in Kanit.
 */

const FONT = 'kanit_regular.ttf';
const THAI = 'สวัสดี โลก';
const CHURN_LOADS = 250;

type Phase = 'idle' | 'fallback set' | 'churning' | 'mounted';

export default function Issue369FontPickerGC() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [churned, setChurned] = useState(0);
  const running = useRef(false);

  const start = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setChurned(0);
    const kanit = await RiveFonts.loadFont(FONT);
    await RiveFonts.setFallbackFonts({ default: [kanit] });
    setPhase('churning');
    for (let i = 1; i <= CHURN_LOADS && running.current; i++) {
      await RiveFonts.loadFont(FONT);
      if (i % 10 === 0) setChurned(i);
    }
    setChurned(CHURN_LOADS);
    if (running.current) setPhase('mounted');
  }, []);

  const reset = useCallback(async () => {
    running.current = false;
    setPhase('idle');
    setChurned(0);
    await RiveFonts.clearFallbackFonts();
  }, []);

  useEffect(() => {
    start();
    return () => {
      running.current = false;
    };
  }, [start]);

  return (
    <View style={styles.container}>
      <View style={styles.riveContainer}>
        {phase === 'mounted' ? <ThaiText /> : null}
      </View>
      <Text style={styles.status}>
        phase: {phase} · churned {churned}/{CHURN_LOADS}
      </Text>
      <Text style={styles.hint}>
        Expected: "{THAI}" renders in the Rive view above. Blank means the
        fallback picker was garbage-collected.
      </Text>
      <View style={styles.buttons}>
        <Pressable
          style={styles.button}
          onPress={async () => {
            await reset();
            start();
          }}
        >
          <Text style={styles.buttonText}>Start</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ThaiText() {
  const { riveViewRef, setHybridRef } = useRive();
  const { riveFile } = useRiveFile(
    require('../../assets/rive/font_fallback.riv')
  );
  const { instance } = useViewModelInstance(riveFile, { async: true });
  const { setValue } = useRiveString('text', instance);

  useEffect(() => {
    setValue(THAI);
    riveViewRef?.playIfNeeded();
  }, [setValue, riveViewRef]);

  if (!riveFile || !instance) {
    return <ActivityIndicator size="large" />;
  }
  return (
    <RiveView
      hybridRef={setHybridRef}
      file={riveFile}
      dataBind={instance}
      fit={Fit.Contain}
      style={StyleSheet.absoluteFill}
    />
  );
}

Issue369FontPickerGC.metadata = {
  name: 'Issue #369: fallback font picker GC',
  description: 'Android fallback fonts stop working after a garbage collection',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  riveContainer: {
    height: 200,
    backgroundColor: '#222',
    borderRadius: 8,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  status: { marginTop: 16, fontSize: 14, fontFamily: 'monospace' },
  hint: { marginTop: 8, fontSize: 13, color: '#666' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
