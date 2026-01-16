/**
 * View Recycling Bug Reproducer
 *
 * Tests that RiveView properly resets props when navigating between screens.
 * Bug: When navigating OutOfBandAssets → QuickStart → DataBindingArtboards,
 * the file from OutOfBandAssets persists while artboardName from
 * DataBindingArtboards is applied, causing "Artboard 'Main' not found".
 *
 * This exerciser simulates that flow with inline navigation.
 */

import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { RiveView, useRiveFile, Fit } from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

type Screen = 'A' | 'B' | 'C';

const screens: Record<
  Screen,
  { title: string; artboardName?: string; file: string }
> = {
  A: {
    title: 'Screen A (artboard: "Artboard")',
    artboardName: 'Artboard',
    file: 'out_of_band',
  },
  B: {
    title: 'Screen B (no artboardName)',
    artboardName: undefined,
    file: 'quick_start',
  },
  C: {
    title: 'Screen C (artboard: "Main")',
    artboardName: 'Main',
    file: 'swap_character_main',
  },
};

function ScreenA() {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/out_of_band.riv')
  );
  if (!riveFile) return <Text>Loading...</Text>;
  return (
    <RiveView
      file={riveFile}
      artboardName="Artboard"
      stateMachineName="State Machine 1"
      fit={Fit.Contain}
      style={styles.rive}
    />
  );
}

function ScreenB() {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/quick_start.riv')
  );
  if (!riveFile) return <Text>Loading...</Text>;
  return (
    <RiveView
      file={riveFile}
      fit={Fit.Contain}
      style={styles.rive}
      autoPlay={true}
    />
  );
}

function ScreenC() {
  const { riveFile } = useRiveFile(
    require('../../assets/swap_character_main.riv')
  );
  if (!riveFile) return <Text>Loading...</Text>;
  return (
    <RiveView
      file={riveFile}
      artboardName="Main"
      stateMachineName="State Machine 1"
      fit={Fit.Layout}
      style={styles.rive}
      autoPlay={true}
    />
  );
}

export default function ViewRecyclingTest() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('A');
  const [error, setError] = useState<string | null>(null);

  const navigate = (screen: Screen) => {
    setError(null);
    setCurrentScreen(screen);
  };

  const runSequence = async () => {
    setError(null);
    // Simulate the problematic navigation sequence
    navigate('A');
    await new Promise((r) => setTimeout(r, 500));
    navigate('B');
    await new Promise((r) => setTimeout(r, 500));
    navigate('C'); // This should NOT error with "Artboard 'Main' not found"
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>View Recycling Test</Text>
      <Text style={styles.subtitle}>
        Tests that props reset properly when navigating between RiveViews
      </Text>

      <View style={styles.buttonRow}>
        {(['A', 'B', 'C'] as Screen[]).map((screen) => (
          <Pressable
            key={screen}
            style={[
              styles.button,
              currentScreen === screen && styles.buttonActive,
            ]}
            onPress={() => navigate(screen)}
          >
            <Text style={styles.buttonText}>{screen}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.sequenceButton} onPress={runSequence}>
        <Text style={styles.buttonText}>Run A → B → C Sequence</Text>
      </Pressable>

      <View style={styles.info}>
        <Text style={styles.infoTitle}>{screens[currentScreen].title}</Text>
        <Text style={styles.infoText}>
          artboardName: {screens[currentScreen].artboardName ?? '(default)'}
        </Text>
        <Text style={styles.infoText}>file: {screens[currentScreen].file}</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.riveContainer}>
        {currentScreen === 'A' && <ScreenA />}
        {currentScreen === 'B' && <ScreenB />}
        {currentScreen === 'C' && <ScreenC />}
      </View>

      <Text style={styles.instructions}>
        Bug reproduction: Navigate A → B → C quickly. If view recycling is
        broken, Screen C will error with "Artboard 'Main' not found" because the
        file from Screen A persists.
      </Text>
    </View>
  );
}

ViewRecyclingTest.metadata = {
  name: 'View Recycling Test',
  description:
    'Tests RiveView prop reset during navigation to catch recycling bugs',
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
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: '#34C759',
  },
  sequenceButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FF9500',
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  info: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
  },
  riveContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  rive: {
    flex: 1,
  },
  instructions: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontWeight: '600',
  },
});
