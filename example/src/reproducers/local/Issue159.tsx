import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { RiveView, Fit, useRiveFile, useRive } from '@rive-app/react-native';
import { scheduleOnUI } from 'react-native-worklets';
import { type Metadata } from '../../shared/metadata';

/**
 * Reproduces issue #159 — Rive graphics stutter when JS/UI thread is under heavy load.
 *
 * Loads vehicles.riv from URL (endless animation).
 * Two buttons: block JS thread or block UI thread for ~60s.
 * If the vehicles stop animating, rendering depends on that thread.
 */

const VEHICLES_URL = require('../../../assets/rive/rewards.riv');

const JS_BLOCK_MS = 10_000;
const JS_ROUNDS = 6;

const UI_BLOCK_MS = 62;
const UI_GAP_MS = 50;
const UI_TOTAL_SECONDS = 60;

function spinFor(ms: number) {
  'worklet';
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // burn CPU
  }
}

export default function Issue159Page() {
  const { riveFile, isLoading, error } = useRiveFile(VEHICLES_URL);
  const { setHybridRef } = useRive();
  const [status, setStatus] = useState('idle');

  const blockJsThread = () => {
    setStatus('JS blocking...');
    setTimeout(() => {
      let round = 0;
      const blockRound = () => {
        round++;
        if (round > JS_ROUNDS) {
          setStatus('idle');
          return;
        }
        setStatus(`JS round ${round}/${JS_ROUNDS}...`);
        setTimeout(() => {
          spinFor(JS_BLOCK_MS);
          blockRound();
        }, 1);
      };
      blockRound();
    }, 100);
  };

  const blockUiThread = () => {
    setStatus('UI blocking...');
    const totalBursts = Math.floor(
      (UI_TOTAL_SECONDS * 1000) / (UI_BLOCK_MS + UI_GAP_MS)
    );
    let burst = 0;
    const nextBurst = () => {
      burst++;
      if (burst > totalBursts) {
        setStatus('idle');
        return;
      }
      if (burst % 50 === 0) {
        const sec = Math.round((burst * (UI_BLOCK_MS + UI_GAP_MS)) / 1000);
        setStatus(`UI ${sec}s/${UI_TOTAL_SECONDS}s...`);
      }
      scheduleOnUI(() => {
        'worklet';
        spinFor(UI_BLOCK_MS);
      });
      setTimeout(nextBurst, UI_GAP_MS);
    };
    setTimeout(nextBurst, 100);
  };

  const blocking = status !== 'idle';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>#159 — Thread stutter</Text>
      <Text style={styles.subtitle}>
        Platform: {Platform.OS}
        {'\n'}Block JS or UI thread for ~{UI_TOTAL_SECONDS}s.
        {'\n'}Watch if the vehicles keep animating or freeze.
      </Text>

      <View style={styles.riveContainer}>
        {isLoading && (
          <ActivityIndicator
            size="large"
            color="#007AFF"
            style={StyleSheet.absoluteFillObject}
          />
        )}
        {error && <Text style={styles.errorText}>{error.message}</Text>}
        {riveFile && (
          <RiveView
            hybridRef={setHybridRef}
            file={riveFile}
            fit={Fit.Contain}
            autoPlay={true}
            style={StyleSheet.absoluteFillObject}
          />
        )}
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={[
            styles.button,
            styles.flex1,
            blocking ? styles.blockingButton : styles.jsButton,
          ]}
          onPress={blockJsThread}
          disabled={blocking || !riveFile}
        >
          <Text style={styles.buttonText}>
            {status.startsWith('JS') ? status : 'Block JS (60s)'}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            styles.flex1,
            blocking ? styles.blockingButton : styles.uiButton,
          ]}
          onPress={blockUiThread}
          disabled={blocking || !riveFile}
        >
          <Text style={styles.buttonText}>
            {status.startsWith('UI') ? status : 'Block UI (60s)'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

Issue159Page.metadata = {
  name: '#159 Thread stutter',
  description: 'Rive graphics stutter when JS/UI thread is under heavy load',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  riveContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  flex1: {
    flex: 1,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  jsButton: {
    backgroundColor: '#FF3B30',
  },
  uiButton: {
    backgroundColor: '#FF9500',
  },
  blockingButton: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
