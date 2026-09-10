import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Fit,
  RiveRuntime,
  RiveView,
  useRiveFile,
} from '@rive-app/react-native';
import type { Metadata } from '../shared/metadata';

// ore.riv is the GPU Canvas sample shipped with rive-android's example app.
const ORE = require('../../assets/rive/ore.riv');

export default function GPUCanvasDemo() {
  const [gpuCanvas] = useState(() => {
    RiveRuntime.setGPUCanvasEnabled(true);
    return RiveRuntime.isGPUCanvasEnabled();
  });
  const { riveFile, error: fileError } = useRiveFile(ORE);
  const [viewError, setViewError] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <Text style={[styles.status, gpuCanvas ? styles.ok : styles.warn]}>
        {gpuCanvas
          ? 'GPU Canvas enabled'
          : 'GPU Canvas request ignored: a Rive file was already loaded in this process. Restart the app and open this page first.'}
      </Text>
      {fileError && <Text style={styles.error}>{fileError.message}</Text>}
      {viewError && <Text style={styles.error}>{viewError}</Text>}
      {riveFile && (
        <RiveView
          style={styles.rive}
          file={riveFile}
          autoPlay={true}
          fit={Fit.Contain}
          onError={(e) => setViewError(e.message)}
        />
      )}
    </View>
  );
}

GPUCanvasDemo.metadata = {
  name: 'GPU Canvas (3D)',
  description:
    'Enables RiveRuntime.setGPUCanvasEnabled(true) and renders a 3D scene. Must be the first Rive page opened after a cold start.',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c1935',
  },
  status: {
    padding: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  ok: { color: '#8ef0a8' },
  warn: { color: '#ffcf70' },
  error: {
    padding: 12,
    color: '#ff8080',
    textAlign: 'center',
  },
  rive: {
    flex: 1,
  },
});
