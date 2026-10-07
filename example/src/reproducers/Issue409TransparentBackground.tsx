import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { RiveView, Fit, useRiveFile } from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Issue #409: on the new Android backend, areas of a RiveView without
 * artboard content rendered black instead of showing the views behind it.
 *
 * The artboard is letterboxed with Fit.Contain inside a wide frame, so both
 * sides of it are transparent. Expected: the background colour (and the
 * stripes) show through on both sides; black there means the bug.
 */

const BACKGROUNDS = ['#ff00ff', '#00c853', '#ffffff'];

export default function Issue409TransparentBackground() {
  const { riveFile, error } = useRiveFile(
    require('../../assets/rive/rewards.riv')
  );
  const [bg, setBg] = useState(0);

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Both sides of the artboard should show the background, not black.
      </Text>
      <View style={[styles.frame, { backgroundColor: BACKGROUNDS[bg] }]}>
        <View style={styles.stripe} />
        {riveFile ? (
          <RiveView
            file={riveFile}
            fit={Fit.Contain}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <Text>{error ? String(error) : 'Loading…'}</Text>
        )}
      </View>
      <Pressable
        style={styles.button}
        onPress={() => setBg((i) => (i + 1) % BACKGROUNDS.length)}
      >
        <Text style={styles.buttonText}>Change background</Text>
      </Pressable>
    </View>
  );
}

Issue409TransparentBackground.metadata = {
  name: 'Issue #409: transparent background',
  description: 'Transparent RiveView areas rendered black on Android',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  hint: { fontSize: 15, marginBottom: 12 },
  frame: {
    height: 220,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  stripe: { height: 24, backgroundColor: '#2962ff' },
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
