import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import {
  RiveView,
  RiveImages,
  useRiveFile,
  useViewModelInstance,
  Fit,
  type RiveFile,
  type RiveImage,
  type RiveViewRef,
  type ViewModelImageProperty,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Reproducer for the Android memory growth reported against 0.4.11 with
 * rive-android 11.12.1:
 *  (a) mounting/unmounting a RiveView never gives a chunk of memory back
 *  (b) swapping a data-bound image never frees the previous image
 *
 * The test images are 2048x2048, so each leaked image is ~21 MB of texture
 * memory. On a device that shows up in `adb shell dumpsys meminfo rive.example`
 * (Graphics / GL mtrack); on an emulator the textures live in the host process,
 * so sample `footprint -p <qemu pid>` (IOAccelerator) instead.
 * Broken: memory grows with the counters. Fixed: it plateaus.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const IMAGE_URIS = [
  Image.resolveAssetSource(require('../../assets/images/leak_a.png')).uri,
  Image.resolveAssetSource(require('../../assets/images/leak_b.png')).uri,
];

const SCENARIOS = [
  'mount',
  'mount-file',
  'mount-image',
  'mount-image-noview',
  'mount-image-clear',
  'mount-loadonly',
  'swap-fresh',
  'swap-reuse',
] as const;
type Scenario = (typeof SCENARIOS)[number];
const isMountScenario = (s: Scenario) => s.startsWith('mount');

declare const HermesInternal:
  | { getInstrumentedStats?: () => Record<string, number> }
  | undefined;

function jsHeapMB(): string {
  const stats = HermesInternal?.getInstrumentedStats?.();
  const bytes = stats?.js_heapSize ?? stats?.js_allocatedBytes;
  return bytes ? (bytes / 1024 / 1024).toFixed(1) : 'n/a';
}

function forceGC() {
  (globalThis as { gc?: () => void }).gc?.();
}

export default function AndroidMemoryLeak() {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/databinding_images.riv')
  );
  const [scenario, setScenario] = useState<Scenario>('mount');
  const [running, setRunning] = useState(false);
  const [disposeOld, setDisposeOld] = useState(true);
  const [mounted, setMounted] = useState(true);
  const [mountCycles, setMountCycles] = useState(0);
  const [swaps, setSwaps] = useState(0);
  const [heap, setHeap] = useState(jsHeapMB());
  const runningRef = useRef(false);
  const onSwap = useCallback(() => setSwaps((c) => c + 1), []);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    const id = setInterval(() => setHeap(jsHeapMB()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!running || !isMountScenario(scenario)) return;
    let cancelled = false;
    (async () => {
      while (runningRef.current && !cancelled) {
        setMounted(false);
        await sleep(150);
        setMounted(true);
        setMountCycles((c) => c + 1);
        await sleep(250);
        if (Math.random() < 0.1) forceGC();
      }
    })();
    return () => {
      cancelled = true;
      setMounted(true);
    };
  }, [running, scenario]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Android Memory Leak</Text>
      <Text style={styles.subtitle}>
        (a) RiveView mount/unmount cycles, (b) data-bound image swaps. Sample
        `dumpsys meminfo rive.example` while running.
      </Text>
      <View style={styles.row}>
        {SCENARIOS.map((s) => (
          <Pressable
            key={s}
            testID={`scenario-${s}`}
            style={[styles.button, scenario === s && styles.buttonActive]}
            onPress={() => {
              setRunning(false);
              setScenario(s);
            }}
          >
            <Text style={styles.buttonText}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <Pressable
          testID="toggle-run"
          style={[styles.button, styles.startButton]}
          onPress={() => setRunning((r) => !r)}
        >
          <Text style={styles.buttonText}>{running ? 'Stop' : 'Start'}</Text>
        </Pressable>
        <Pressable
          testID="toggle-dispose"
          style={[styles.button, disposeOld && styles.buttonActive]}
          onPress={() => setDisposeOld((d) => !d)}
        >
          <Text style={styles.buttonText}>
            dispose old image: {disposeOld ? 'on' : 'off'}
          </Text>
        </Pressable>
        <Pressable testID="gc" style={styles.button} onPress={forceGC}>
          <Text style={styles.buttonText}>GC</Text>
        </Pressable>
      </View>
      <View style={styles.statusBox}>
        <Text testID="status" style={styles.statusText}>
          {running ? 'running' : 'stopped'} | scenario: {scenario} | mount
          cycles: {mountCycles} | image swaps: {swaps} | JS heap: {heap} MB
        </Text>
      </View>
      <View style={styles.riveContainer}>
        {riveFile && mounted && scenario === 'mount' && (
          <RiveView file={riveFile} fit={Fit.Contain} style={styles.rive} />
        )}
        {mounted && scenario !== 'mount' && isMountScenario(scenario) && (
          <MountedScene
            withImage={scenario !== 'mount-file'}
            bindImage={scenario !== 'mount-loadonly'}
            withView={scenario !== 'mount-image-noview'}
            clearOnUnmount={scenario === 'mount-image-clear'}
          />
        )}
        {riveFile && !isMountScenario(scenario) && (
          <ImageSwapper
            file={riveFile}
            running={running}
            reuse={scenario === 'swap-reuse'}
            disposeOld={disposeOld}
            onSwap={onSwap}
          />
        )}
      </View>
    </ScrollView>
  );
}

// Owns everything a typical screen would: its own file, view model instance
// and (optionally) a freshly loaded image, all torn down on unmount.
function MountedScene({
  withImage,
  bindImage,
  withView,
  clearOnUnmount,
}: {
  withImage: boolean;
  bindImage: boolean;
  withView: boolean;
  clearOnUnmount: boolean;
}) {
  const { riveFile } = useRiveFile(
    require('../../assets/rive/databinding_images.riv')
  );
  const { instance } = useViewModelInstance(riveFile, { async: true });

  useEffect(() => {
    if (!instance || !withImage) return;
    let cancelled = false;
    let image: RiveImage | undefined;
    const prop = instance.imageProperty('bound_image');
    RiveImages.loadFromURLAsync(IMAGE_URIS[0]!).then((img) => {
      image = img;
      if (!cancelled && bindImage) prop?.set(img);
    });
    return () => {
      cancelled = true;
      if (clearOnUnmount) prop?.set(undefined);
      prop?.dispose();
      image?.dispose();
    };
  }, [instance, withImage, bindImage, clearOnUnmount]);

  if (!riveFile || !instance || !withView) return null;
  return (
    <RiveView
      file={riveFile}
      dataBind={instance}
      fit={Fit.Contain}
      style={styles.rive}
    />
  );
}

function ImageSwapper({
  file,
  running,
  reuse,
  disposeOld,
  onSwap,
}: {
  file: RiveFile;
  running: boolean;
  reuse: boolean;
  disposeOld: boolean;
  onSwap: () => void;
}) {
  const { instance } = useViewModelInstance(file, { async: true });
  const propRef = useRef<ViewModelImageProperty | undefined>(undefined);
  const viewRef = useRef<RiveViewRef | null>(null);

  useEffect(() => {
    if (!instance) return;
    const prop = instance.imageProperty('bound_image');
    propRef.current = prop;
    return () => {
      propRef.current = undefined;
      prop?.dispose();
    };
  }, [instance]);

  useEffect(() => {
    if (!running || !instance) return;
    let cancelled = false;
    (async () => {
      const preloaded = reuse
        ? await Promise.all(
            IMAGE_URIS.map((u) => RiveImages.loadFromURLAsync(u))
          )
        : [];
      let previous: RiveImage | undefined;
      let i = 0;
      while (!cancelled) {
        const next = reuse
          ? preloaded[i % 2]!
          : await RiveImages.loadFromURLAsync(IMAGE_URIS[i % 2]!);
        if (cancelled) break;
        propRef.current?.set(next);
        // A settled state machine is not woken by an image change on the new
        // backend, so nudge it to render the swap.
        viewRef.current?.playIfNeeded();
        if (!reuse && disposeOld) previous?.dispose();
        previous = next;
        i++;
        onSwap();
        await sleep(200);
        if (i % 10 === 0) forceGC();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [running, instance, reuse, disposeOld, onSwap]);

  if (!instance) return null;
  return (
    <RiveView
      file={file}
      dataBind={instance}
      hybridRef={{ f: (ref) => (viewRef.current = ref) }}
      fit={Fit.Contain}
      style={styles.rive}
    />
  );
}

AndroidMemoryLeak.metadata = {
  name: 'Android Memory Leak',
  description:
    'RiveView mount/unmount and data-bound image swaps must not grow native memory',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: {
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#8E8E93',
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: '#007AFF',
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statusBox: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 13,
    color: '#333',
  },
  riveContainer: {
    height: 360,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  rive: {
    flex: 1,
  },
});
