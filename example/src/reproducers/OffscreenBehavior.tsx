import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import {
  RiveView,
  useRiveFile,
  Fit,
  type OffscreenBehavior,
  type RiveViewRef,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Manual verifier for offscreenBehavior and renderEnabled (issue #332
 * follow-up).
 *
 * Puts a looping animation into one of several visibility states so process
 * CPU can be sampled externally (e.g. per-thread /proc/<pid>/task stats on
 * Android):
 *
 * - onscreen:   playing, fully visible at the top of the ScrollView
 * - offscreen:  playing, scrolled fully out of the viewport (still mounted)
 * - modal:      playing, covered by a full-screen RN Modal
 * - paused:     pause() via ref, still visible
 * - unmounted:  RiveView removed from the tree
 *
 * With offscreenBehavior 'skip-draws' or 'pause' the offscreen scenario
 * should drop close to the paused cost; scrolling back must resume the
 * animation. The modal scenario is invisible to automatic detection — the
 * renderEnabled←modal toggle wires renderEnabled to it (false or 'pause'
 * while covered), which is the pattern that prop exists for.
 */

type Scenario = 'onscreen' | 'offscreen' | 'modal' | 'paused' | 'unmounted';

const SCENARIOS: { key: Scenario; label: string }[] = [
  { key: 'onscreen', label: 'Onscreen' },
  { key: 'offscreen', label: 'Offscreen (scrolled)' },
  { key: 'modal', label: 'Covered (modal)' },
  { key: 'paused', label: 'Paused' },
  { key: 'unmounted', label: 'Unmounted' },
];

const BEHAVIORS: OffscreenBehavior[] = ['none', 'skip-draws', 'pause'];

// What renderEnabled is set to while the modal covers the view: not wired at
// all, draw skipping only, or a declarative full pause.
const RENDER_WIRINGS = ['off', 'skip-draws', 'pause'] as const;
type RenderWiring = (typeof RENDER_WIRINGS)[number];

export default function OffscreenBehaviorPage() {
  const [scenario, setScenario] = useState<Scenario>('onscreen');
  const [behavior, setBehavior] = useState<OffscreenBehavior>('none');
  const [renderWiring, setRenderWiring] = useState<RenderWiring>('off');
  const viewRef = useRef<RiveViewRef | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const { riveFile } = useRiveFile(require('../../assets/rive/rewards.riv'));

  const mounted = scenario !== 'unmounted';

  const applyScenario = (next: Scenario) => {
    const prev = scenario;
    setScenario(next);
    if (prev === 'paused' && next !== 'paused') {
      viewRef.current?.play();
    }
    if (next === 'paused') {
      viewRef.current?.pause();
    }
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: next === 'offscreen' ? 1200 : 0,
        animated: false,
      });
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.status} testID="offscreen-status">
        {scenario.toUpperCase()} · {behavior}
        {renderWiring !== 'off'
          ? ` +renderEnabled←modal (${renderWiring})`
          : ''}
      </Text>
      <View style={styles.buttonRow}>
        {SCENARIOS.map(({ key, label }) => (
          <Pressable
            key={key}
            testID={`offscreen-${key}`}
            style={[styles.button, key === scenario && styles.buttonActive]}
            onPress={() => applyScenario(key)}
          >
            <Text
              style={[
                styles.buttonText,
                key === scenario && styles.buttonTextActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.buttonRow}>
        {BEHAVIORS.map((value) => (
          <Pressable
            key={value}
            testID={`offscreen-behavior-${value}`}
            style={[styles.button, value === behavior && styles.buttonActive]}
            onPress={() => setBehavior(value)}
          >
            <Text
              style={[
                styles.buttonText,
                value === behavior && styles.buttonTextActive,
              ]}
            >
              {value}
            </Text>
          </Pressable>
        ))}
        <Pressable
          testID="offscreen-renderenabled-toggle"
          style={[styles.button, renderWiring !== 'off' && styles.buttonActive]}
          onPress={() =>
            setRenderWiring(
              (v) =>
                RENDER_WIRINGS[
                  (RENDER_WIRINGS.indexOf(v) + 1) % RENDER_WIRINGS.length
                ]!
            )
          }
        >
          <Text
            style={[
              styles.buttonText,
              renderWiring !== 'off' && styles.buttonTextActive,
            ]}
          >
            renderEnabled←modal: {renderWiring}
          </Text>
        </Pressable>
      </View>
      <ScrollView ref={scrollRef} style={styles.scroll}>
        <View style={styles.riveContainer}>
          {mounted && riveFile ? (
            <RiveView
              file={riveFile}
              fit={Fit.Contain}
              autoPlay={true}
              offscreenBehavior={behavior}
              renderEnabled={
                renderWiring === 'off' || scenario !== 'modal'
                  ? true
                  : renderWiring === 'skip-draws'
                    ? false
                    : 'pause'
              }
              hybridRef={{ f: (ref) => (viewRef.current = ref) }}
              style={styles.rive}
            />
          ) : (
            <Text style={styles.loading}>
              {mounted ? 'Loading…' : 'Unmounted'}
            </Text>
          )}
        </View>
        <View style={styles.spacer}>
          <Text style={styles.spacerText}>
            Scrolled content — the Rive view is above the viewport
          </Text>
        </View>
      </ScrollView>
      <Modal
        visible={scenario === 'modal'}
        animationType="none"
        onRequestClose={() => applyScenario('onscreen')}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Covering modal</Text>
          <Text style={styles.modalText}>
            The Rive view is mounted and playing underneath this modal.
          </Text>
          <Pressable
            testID="offscreen-modal-close"
            style={styles.button}
            onPress={() => applyScenario('onscreen')}
          >
            <Text style={styles.buttonText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

OffscreenBehaviorPage.metadata = {
  name: 'Offscreen behavior',
  description:
    'CPU cost of a playing looping animation when offscreen/covered, and the offscreenBehavior/renderEnabled props that reduce it (issue #332)',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  status: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#222',
    color: '#0f0',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 12,
  },
  buttonTextActive: {
    color: '#fff',
  },
  scroll: {
    flex: 1,
  },
  riveContainer: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rive: {
    width: 300,
    height: 300,
  },
  loading: {
    fontSize: 16,
    color: '#666',
  },
  spacer: {
    height: 1600,
    alignItems: 'center',
    paddingTop: 400,
  },
  spacerText: {
    color: '#999',
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalText: {
    color: '#666',
    paddingHorizontal: 32,
    textAlign: 'center',
  },
});
