import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type ViewStyle,
} from 'react-native';
import {
  RiveView,
  Fit,
  useRiveFile,
  type RiveFile,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Issue #393: on iOS devices where UIScreen.nativeScale != scale (Display
 * Zoom, iPhone mini and Plus), MTKView sizes its drawable through ancestor
 * transforms. A rotated parent squashes the artboard; a parent at scale(0)
 * when the view mounts leaves it blank after the scale returns to 1.
 *
 * Run on an iPhone 13 mini simulator. All three artboards should keep the
 * same aspect ratio, including after Remount and Resize.
 */

const W = 100;
const H = 148;
const ZERO_SCALE_HOLD_MS = 1500;

function Cell({
  label,
  transform,
  file,
  resized,
}: {
  label: string;
  transform: ViewStyle['transform'];
  file: RiveFile;
  resized: boolean;
}) {
  const size = resized ? styles.resized : styles.size;
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <View style={[styles.frame, size, { transform }]}>
        <RiveView file={file} fit={Fit.Contain} style={size} />
      </View>
    </View>
  );
}

export default function Issue393DisplayZoom() {
  const { riveFile, error } = useRiveFile(
    require('../../assets/rive/rewards.riv')
  );
  const [generation, setGeneration] = useState(0);
  const [zeroScaled, setZeroScaled] = useState(true);
  const [resized, setResized] = useState(false);

  useEffect(() => {
    setZeroScaled(true);
    const timer = setTimeout(() => setZeroScaled(false), ZERO_SCALE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [generation, riveFile]);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        generation {generation} ·{' '}
        {zeroScaled ? 'scale(0) holding' : 'scale(0) released'}
      </Text>
      {error ? <Text style={styles.error}>{String(error)}</Text> : null}
      {riveFile ? (
        <View style={styles.row} key={generation}>
          <Cell
            label="control"
            transform={[]}
            file={riveFile}
            resized={resized}
          />
          <Cell
            label="rotate 14°"
            transform={[{ rotate: '14deg' }]}
            file={riveFile}
            resized={resized}
          />
          <Cell
            label="scale 0→1"
            transform={[{ scale: zeroScaled ? 0 : 1 }]}
            file={riveFile}
            resized={resized}
          />
        </View>
      ) : (
        <Text style={styles.subtitle}>loading…</Text>
      )}
      <Pressable
        style={styles.button}
        onPress={() => setGeneration((g) => g + 1)}
      >
        <Text style={styles.buttonText}>Remount</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => setResized((r) => !r)}>
        <Text style={styles.buttonText}>
          {resized ? 'Restore size' : 'Resize'}
        </Text>
      </Pressable>
    </View>
  );
}

Issue393DisplayZoom.metadata = {
  name: 'Issue #393: Display Zoom drawable',
  description:
    'iOS RiveView squashed or blank under a rotated or zero-scaled parent',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 12 },
  subtitle: { fontSize: 12, color: '#666', textAlign: 'center', margin: 8 },
  error: { color: 'red', textAlign: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
  },
  cell: { alignItems: 'center' },
  cellLabel: { fontSize: 12, marginBottom: 16 },
  frame: { backgroundColor: '#dde6ff' },
  size: { width: W, height: H },
  resized: { width: W * 1.3, height: H * 0.7 },
  button: {
    marginTop: 40,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
