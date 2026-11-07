import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Fit,
  RiveImages,
  RiveView,
  useRiveFile,
  useViewModelInstance,
  type RiveFile,
  type RiveImage,
  type ViewModelImageProperty,
} from '@rive-app/react-native';
import { type Metadata } from '../shared/metadata';

/**
 * Android only: an OutOfMemoryError while decoding an image kills the app from
 * the `Rive CmdServer` thread, because nothing can catch it there.
 *
 * Images are not committed. Generate each with a different size and name, e.g.
 *   ffmpeg -f lavfi -i color=c=0xE0218A:s=4096x4096,noise=alls=25:allf=t \
 *     -frames:v 1 noise-4096.png
 * then push them where a Release build can read them without cleartext traffic:
 *   adb shell mkdir -p /data/local/tmp/oom
 *   adb push *.jpg *.png /data/local/tmp/oom/
 *
 * Every cycle is logged as `[oom] ...`, so `adb logcat -s ReactNativeJS` and
 * `adb shell dumpsys meminfo rive.example` show how far a run got. Broken: the
 * process dies. Fixed: every run finishes.
 */

const IMAGE_DIR = 'file:///data/local/tmp/oom/';
const IMAGES = [
  'photo-2048.jpg',
  'photo-4096.jpg',
  'photo-12mp.jpg',
  'noise-4096.jpg',
  'noise-4096.png',
  'photo-50mp.jpg',
];
const SCENARIOS = [
  'one',
  'replace-same',
  'replace-fresh',
  'replace-dispose',
  'hold',
  'list',
] as const;
type Scenario = (typeof SCENARIOS)[number];
const CYCLES = 40;
const CYCLE_MS = 1500;
const LIST_ITEMS = Array.from({ length: 30 }, (_, i) => i);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function log(status: string) {
  console.log(`[oom] ${status}`);
}

export default function AndroidImageOom() {
  const { riveFile, error } = useRiveFile(
    require('../../assets/rive/databinding_images.riv')
  );
  const [imageName, setImageName] = useState(IMAGES[1]!);
  const [scenario, setScenario] = useState<Scenario>('replace-fresh');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('idle');
  const stopRequested = useRef(false);
  const listRef = useRef<FlatList<number>>(null);
  const propRef = useRef<ViewModelImageProperty | undefined>(undefined);

  const report = useCallback((text: string) => {
    log(text);
    setStatus(text);
  }, []);

  const load = useCallback(
    () => RiveImages.loadFromURLAsync(IMAGE_DIR + imageName),
    [imageName]
  );

  const runReplacements = useCallback(async () => {
    const shared = scenario === 'replace-same' ? await load() : undefined;
    const held: RiveImage[] = [];
    let previous: RiveImage | undefined;
    for (let i = 1; i <= CYCLES && !stopRequested.current; i++) {
      // An app that survives a failed load keeps using the images it has.
      const image: RiveImage | undefined =
        shared ?? (await load().catch(() => previous));
      if (!image) throw new Error('first load failed');
      propRef.current?.set(image);
      if (scenario === 'hold') held.push(image);
      if (scenario === 'replace-dispose' && previous !== image) {
        previous?.dispose();
      }
      previous = image;
      report(`${scenario} ${imageName} cycle ${i}/${CYCLES}`);
      await sleep(CYCLE_MS);
    }
  }, [imageName, load, report, scenario]);

  const runList = useCallback(async () => {
    for (let i = 0; i < 3 && !stopRequested.current; i++) {
      for (let y = 0; y <= 40 && !stopRequested.current; y++) {
        listRef.current?.scrollToOffset({ offset: y * 150, animated: false });
        report(`list ${imageName} pass ${i + 1}/3 y=${y * 150}`);
        await sleep(600);
      }
    }
  }, [imageName, report]);

  const run = useCallback(async () => {
    stopRequested.current = false;
    setRunning(true);
    try {
      if (scenario === 'one') {
        propRef.current?.set(await load());
        report(`one ${imageName} set`);
        await sleep(3000);
      } else if (scenario === 'list') {
        await runList();
      } else {
        await runReplacements();
      }
      report(`DONE ${scenario} ${imageName}`);
    } catch (e) {
      report(`FAILED ${scenario} ${imageName}: ${String(e)}`);
    } finally {
      setRunning(false);
    }
  }, [imageName, load, report, runList, runReplacements, scenario]);

  return (
    <View style={styles.container}>
      <Text testID="oom-status" style={styles.status}>
        {error ? String(error) : status}
      </Text>
      <Options
        values={IMAGES}
        selected={imageName}
        disabled={running}
        onSelect={setImageName}
      />
      <Options
        values={SCENARIOS}
        selected={scenario}
        disabled={running}
        onSelect={setScenario}
      />
      <Pressable
        testID="oom-run"
        style={styles.run}
        onPress={() => (running ? (stopRequested.current = true) : run())}
      >
        <Text style={styles.label}>{running ? 'Stop' : 'Start'}</Text>
      </Pressable>
      {riveFile && scenario === 'list' ? (
        <FlatList
          ref={listRef}
          data={LIST_ITEMS}
          keyExtractor={String}
          renderItem={() => <Row file={riveFile} imageName={imageName} />}
        />
      ) : riveFile ? (
        <Row file={riveFile} imageName={imageName} propRef={propRef} />
      ) : null}
    </View>
  );
}

function Options<T extends string>({
  values,
  selected,
  disabled,
  onSelect,
}: {
  values: readonly T[];
  selected: T;
  disabled: boolean;
  onSelect: (value: T) => void;
}) {
  return (
    <ScrollView horizontal style={styles.options}>
      {values.map((value) => (
        <Pressable
          key={value}
          testID={`oom-${value}`}
          disabled={disabled}
          style={[styles.option, value === selected && styles.selected]}
          onPress={() => onSelect(value)}
        >
          <Text style={styles.label}>{value}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// A row without propRef loads its own image, like a list item would.
function Row({
  file,
  imageName,
  propRef,
}: {
  file: RiveFile;
  imageName: string;
  propRef?: RefObject<ViewModelImageProperty | undefined>;
}) {
  const { instance } = useViewModelInstance(file, { async: true });

  useEffect(() => {
    if (!instance) return;
    const prop = instance.imageProperty('bound_image');
    if (propRef) {
      propRef.current = prop;
      return;
    }
    let cancelled = false;
    RiveImages.loadFromURLAsync(IMAGE_DIR + imageName)
      .then((image) => {
        if (!cancelled) prop?.set(image);
      })
      .catch((e) => log(`row load failed: ${String(e)}`));
    return () => {
      cancelled = true;
    };
  }, [imageName, instance, propRef]);

  if (!instance) return null;
  return (
    <RiveView
      file={file}
      dataBind={instance}
      fit={Fit.Contain}
      style={styles.rive}
    />
  );
}

AndroidImageOom.metadata = {
  name: 'Android image OOM',
  description: 'Large images must not kill the app from the Rive CmdServer',
} satisfies Metadata;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 8, backgroundColor: '#111' },
  status: { color: '#fff', fontSize: 12, marginBottom: 6 },
  options: { flexGrow: 0, marginBottom: 6 },
  option: { padding: 8, marginRight: 6, backgroundColor: '#333' },
  selected: { backgroundColor: '#2563eb' },
  run: { padding: 12, marginBottom: 6, backgroundColor: '#16a34a' },
  label: { color: '#fff', textAlign: 'center', fontSize: 12 },
  rive: { height: 150, width: '100%' },
});
