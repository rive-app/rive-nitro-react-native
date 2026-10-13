import { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, StyleSheet } from 'react-native';
import { Fit, RiveView, useRiveFile } from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Issue #418: on the Android new backend, resizing a mounted RiveView kept
 * rendering into a surface sized at creation time, so Fit.Layout content
 * looked scaled and offset until remount.
 *
 * Toggle the height, then Remount at the same height: both should look
 * identical.
 */

const SHORT = 200;
const TALL = 400;

export default function Issue418SurfaceResize() {
  const { riveFile, error } = useRiveFile(
    require('../../assets/rive/layout_test.riv')
  );
  const [height] = useState(() => new Animated.Value(SHORT));
  const tall = useRef(false);
  const [isTall, setIsTall] = useState(false);
  const [generation, setGeneration] = useState(0);

  const toggle = useCallback(() => {
    tall.current = !tall.current;
    setIsTall(tall.current);
    Animated.timing(height, {
      toValue: tall.current ? TALL : SHORT,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [height]);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        target {isTall ? TALL : SHORT}pt · generation {generation}
      </Text>
      {error ? <Text style={styles.error}>{String(error)}</Text> : null}
      <View style={styles.buttons}>
        <Pressable style={styles.button} onPress={toggle}>
          <Text style={styles.buttonText}>Toggle height</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => setGeneration((g) => g + 1)}
        >
          <Text style={styles.buttonText}>Remount</Text>
        </Pressable>
      </View>
      <Animated.View style={[styles.box, { height }]}>
        {riveFile ? (
          <RiveView
            key={generation}
            file={riveFile}
            fit={Fit.Layout}
            autoPlay
            style={styles.rive}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

Issue418SurfaceResize.metadata = {
  name: 'Issue #418: Surface resize',
  description:
    'Android Fit.Layout content stale after the view resizes until remount',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  subtitle: { fontSize: 14, color: '#666' },
  error: { color: 'red', marginTop: 8 },
  buttons: { flexDirection: 'row', gap: 8 },
  box: { marginTop: 16, backgroundColor: '#1a2a3a' },
  rive: { flex: 1 },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
