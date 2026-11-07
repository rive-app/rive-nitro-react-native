import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Fit,
  RiveImages,
  RiveView,
  useRiveFile,
  type RiveImage,
  type RiveViewRef,
  type ViewModelInstance,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * A view-model trigger fired before a view's state machine exists never reaches
 * it on iOS. `fire` moves the probe's state machine into a state that stays, and
 * that state's x flows back to the `firedX` property, so each cycle reads the
 * machine's state instead of inferring it from a transient animation.
 *
 * Images are not committed. Generate them with
 *   ffmpeg -f lavfi -i color=c=0xE0218A:s=4096x4096,noise=alls=25:allf=t \
 *     -frames:v 1 art-4096-1.jpg
 * for cycles 1 to 6 (and art-1024-1.jpg with s=1024x1024), then serve them with
 * `python3 -m http.server 8445`. Android also needs `adb reverse tcp:8445 tcp:8445`,
 * and usesCleartextTraffic in release builds.
 *
 * Set RESULTS_URL to POST each scenario's results to a local collector.
 */

const PROBE = require('../../assets/rive/issue445_probe.riv');
const CYCLES = 6;
const FIRED_X = 0;
const LABEL = 'WRITTEN';
const RESULTS_URL: string | undefined = 'http://localhost:8445/results';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type FireAt =
  | 'beforeMount'
  | 'ref'
  | 'effect'
  | 'ready'
  | { afterRefMs: number }
  | { afterReadyMs: number };

type Scenario = {
  id: string;
  fireAt: FireAt;
  image?: '1024' | '4096';
  // The image write comes first unless this is set.
  triggerFirst?: boolean;
  artboard?: 'Loop' | 'Still';
  autoPlay?: boolean;
  pauseBeforeFire?: boolean;
  // Bind a second instance after ready and fire on that one instead.
  rebind?: boolean;
  fireAgainAfterMs?: number;
};

const SCENARIOS: Scenario[] = [
  { id: 'beforeMount', fireAt: 'beforeMount' },
  { id: 'ref', fireAt: 'ref' },
  { id: 'ref-still', fireAt: 'ref', artboard: 'Still' },
  { id: 'effect', fireAt: 'effect' },
  { id: 'ref+0', fireAt: { afterRefMs: 0 } },
  { id: 'ref+4', fireAt: { afterRefMs: 4 } },
  { id: 'ref+8', fireAt: { afterRefMs: 8 } },
  { id: 'ref+16', fireAt: { afterRefMs: 16 } },
  { id: 'ref+33', fireAt: { afterRefMs: 33 } },
  { id: 'ref+66', fireAt: { afterRefMs: 66 } },
  { id: 'ref+100', fireAt: { afterRefMs: 100 } },
  { id: 'ref+200', fireAt: { afterRefMs: 200 } },
  { id: 'ref-jpg4096-imgfirst', fireAt: 'ref', image: '4096' },
  { id: 'ref-jpg4096-trigfirst', fireAt: 'ref', image: '4096', triggerFirst: true },
  { id: 'ref-jpg1024-imgfirst', fireAt: 'ref', image: '1024' },
  { id: 'ref+33-jpg4096', fireAt: { afterRefMs: 33 }, image: '4096' },
  { id: 'ready', fireAt: 'ready' },
  { id: 'ready-still', fireAt: 'ready', artboard: 'Still' },
  { id: 'ready-jpg4096', fireAt: 'ready', image: '4096' },
  { id: 'ready+500', fireAt: { afterReadyMs: 500 } },
  { id: 'ready+1000-still', fireAt: { afterReadyMs: 1000 }, artboard: 'Still' },
  { id: 'paused', fireAt: 'ready', pauseBeforeFire: true },
  { id: 'autoplay-off-ref', fireAt: 'ref', autoPlay: false },
  { id: 'autoplay-off-ready', fireAt: 'ready', autoPlay: false },
  { id: 'rebind', fireAt: 'ready', rebind: true },
  { id: 'ref-then-again', fireAt: 'ref', fireAgainAfterMs: 500 },
];

const fireTiming = (fireAt: FireAt) =>
  typeof fireAt === 'string' ? fireAt : JSON.stringify(fireAt);

type CycleResult = {
  scenario: string;
  fired: boolean;
  firedAfterPlay: boolean | null;
  labelWritten: boolean;
  triggerListenerFires: number;
  fireMs: number;
  readyMs: number;
};

export default function TriggerAtMount() {
  const { riveFile, error } = useRiveFile(PROBE);
  const [mount, setMount] = useState<{
    key: number;
    instance: ViewModelInstance;
    artboard: string;
    autoPlay: boolean;
  }>();
  const [status, setStatus] = useState('idle');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CycleResult[]>([]);
  const stopRequested = useRef(false);
  const onRef = useRef<((view: RiveViewRef) => void) | null>(null);
  const onEffect = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (mount) onEffect.current?.();
  }, [mount]);

  const runCycle = useCallback(
    async (scenario: Scenario, cycle: number): Promise<CycleResult> => {
      const { fireAt } = scenario;
      const image: RiveImage | undefined = scenario.image
        ? await RiveImages.loadFromURLAsync(
            `http://localhost:8445/art-${scenario.image}-${cycle}.jpg`
          )
        : undefined;
      const viewModel = await riveFile!.viewModelByNameAsync('Probe');
      const first = await viewModel!.createDefaultInstanceAsync();
      const second = scenario.rebind
        ? await viewModel!.createDefaultInstanceAsync()
        : undefined;
      const vmi = second ?? first!;
      let triggerListenerFires = 0;
      const removeListener = vmi
        .triggerProperty('fire')!
        .addListener(() => (triggerListenerFires += 1));

      let start = 0;
      let fireMs = -1;
      const setImage = () => vmi.imageProperty('art')!.set(image);
      const write = () => {
        fireMs = performance.now() - start;
        vmi.stringProperty('label')!.set(LABEL);
        if (image && !scenario.triggerFirst) setImage();
        vmi.triggerProperty('fire')!.trigger();
        if (image && scenario.triggerFirst) setImage();
      };

      start = performance.now();
      if (fireAt === 'beforeMount') write();

      const viewPromise = new Promise<RiveViewRef>((resolve) => {
        onRef.current = (view) => {
          onRef.current = null;
          if (fireAt === 'ref') write();
          if (typeof fireAt === 'object' && 'afterRefMs' in fireAt) {
            // Keeps the worker decoding, which delays the state machine.
            if (image) setImage();
            setTimeout(write, fireAt.afterRefMs);
          }
          resolve(view);
        };
      });
      onEffect.current = () => {
        onEffect.current = null;
        if (fireAt === 'effect') write();
      };
      setMount((previous) => ({
        key: (previous?.key ?? 0) + 1,
        instance: first!,
        artboard: scenario.artboard ?? 'Loop',
        autoPlay: scenario.autoPlay ?? true,
      }));
      const view = await viewPromise;
      await view.awaitViewReady();
      const readyMs = performance.now() - start;

      if (scenario.rebind) {
        view.bindViewModelInstance(vmi);
      }
      if (scenario.pauseBeforeFire) {
        // Long enough for the first draw, which advances even a paused view.
        await sleep(500);
        await view.pause();
      }
      if (typeof fireAt === 'object' && 'afterReadyMs' in fireAt) {
        await sleep(fireAt.afterReadyMs);
        write();
      }
      if (fireAt === 'ready') write();
      if (scenario.fireAgainAfterMs != null) {
        await sleep(scenario.fireAgainAfterMs);
        vmi.triggerProperty('fire')!.trigger();
      }

      await sleep(1500);
      const firedX = vmi.numberProperty('firedX')!;
      const fired = (await firedX.getValueAsync()) === FIRED_X;
      const label = await vmi.stringProperty('label')!.getValueAsync();

      let firedAfterPlay: boolean | null = null;
      if (scenario.pauseBeforeFire || scenario.autoPlay === false) {
        view.playIfNeeded();
        await sleep(1000);
        firedAfterPlay = (await firedX.getValueAsync()) === FIRED_X;
      }

      removeListener();
      setMount(undefined);
      await sleep(200);
      first!.dispose();
      second?.dispose();
      viewModel!.dispose();
      image?.dispose();
      return {
        scenario: scenario.id,
        fired,
        firedAfterPlay,
        labelWritten: label === LABEL,
        triggerListenerFires,
        fireMs,
        readyMs,
      };
    },
    [riveFile]
  );

  const run = useCallback(
    async (scenarios: Scenario[]) => {
      stopRequested.current = false;
      setRunning(true);
      setResults([]);
      for (const scenario of scenarios) {
        const cycles: CycleResult[] = [];
        for (let cycle = 1; cycle <= CYCLES; cycle++) {
          if (stopRequested.current) break;
          setStatus(`${scenario.id} ${cycle}/${CYCLES}`);
          const result = await runCycle(scenario, cycle);
          cycles.push(result);
          setResults((previous) => [...previous, result]);
        }
        if (RESULTS_URL) {
          await fetch(RESULTS_URL, {
            method: 'POST',
            body: JSON.stringify({ scenario, cycles }),
          }).catch(() => {});
        }
      }
      setStatus(stopRequested.current ? 'stopped' : 'done');
      setRunning(false);
    },
    [runCycle]
  );

  const ready = !!riveFile && !running;

  return (
    <ScrollView style={styles.container}>
      {error ? <Text style={styles.error}>{String(error)}</Text> : null}
      <View style={styles.stage}>
        {riveFile && mount ? (
          <RiveView
            key={mount.key}
            file={riveFile}
            artboardName={mount.artboard}
            dataBind={mount.instance}
            fit={Fit.Contain}
            autoPlay={mount.autoPlay}
            hybridRef={{
              f: (ref: RiveViewRef | null) => {
                if (ref) onRef.current?.(ref);
              },
            }}
            style={styles.rive}
          />
        ) : null}
      </View>
      <Text style={styles.status} testID="trigger-status">
        {status}
      </Text>
      <View style={styles.row}>
        <Choice
          label="Start all"
          testID="start-all"
          disabled={!ready}
          onPress={() => run(SCENARIOS)}
        />
        <Choice
          label="Stop"
          testID="stop"
          onPress={() => {
            stopRequested.current = true;
          }}
        />
      </View>
      <View style={styles.row}>
        {SCENARIOS.map((scenario) => (
          <Choice
            key={scenario.id}
            label={scenario.id}
            testID={`start-${scenario.id}`}
            disabled={!ready}
            onPress={() => run([scenario])}
          />
        ))}
      </View>
      {SCENARIOS.map((scenario) => {
        const cycles = results.filter((r) => r.scenario === scenario.id);
        if (cycles.length === 0) return null;
        const fired = cycles.filter((r) => r.fired).length;
        return (
          <Text key={scenario.id} style={styles.result}>
            {scenario.id} ({fireTiming(scenario.fireAt)}): fired {fired}/
            {cycles.length}
          </Text>
        );
      })}
    </ScrollView>
  );
}

function Choice({
  label,
  testID,
  disabled,
  onPress,
}: {
  label: string;
  testID: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={[styles.choice, disabled && styles.choiceDisabled]}
    >
      <Text style={styles.choiceText}>{label}</Text>
    </Pressable>
  );
}

TriggerAtMount.metadata = {
  name: 'Trigger at mount',
  description:
    'Whether a view-model trigger fired around mount reaches the state machine',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  stage: {
    width: 320,
    height: 320,
    alignSelf: 'center',
    backgroundColor: '#0044ff',
  },
  rive: {
    flex: 1,
  },
  status: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 4,
  },
  choice: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#eee',
    borderRadius: 6,
  },
  choiceDisabled: {
    opacity: 0.4,
  },
  choiceText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
  },
  result: {
    fontSize: 11,
    paddingHorizontal: 12,
    marginVertical: 2,
    color: '#333',
  },
  error: {
    color: '#c00',
    textAlign: 'center',
  },
});
