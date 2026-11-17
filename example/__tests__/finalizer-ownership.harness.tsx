import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { Platform, View } from 'react-native';
import {
  RiveView,
  RiveFileFactory,
  RiveImages,
  RiveLog,
  DataBindMode,
  Fit,
  type RiveFile,
  type RiveViewRef,
  type ViewModelInstance,
} from '@rive-app/react-native';

const QUICK_START = require('../assets/rive/quick_start.riv');
const DATABINDING = require('../assets/rive/databinding.riv');
const DATABINDING_LISTS = require('../assets/rive/databinding_lists.riv');

// Only the new Android backend frees native objects from JVM finalizers.
const isAndroidExperimental = () =>
  Platform.OS === 'android' && RiveFileFactory.getBackend() === 'experimental';

function jsGC() {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (!gc)
    throw new Error('global.gc is unavailable, so nothing gets collected');
  gc();
}

// Hermes' gc() drops the JNI references of unreachable wrappers; the large image
// buffers are copied onto the Java heap, which makes ART collect and finalize them.
async function collectGarbage(done: () => boolean = () => false) {
  for (let round = 0; round < 4 && !done(); round++) {
    jsGC();
    for (let i = 0; i < 8; i++) {
      const image = await RiveImages.loadFromBytesAsync(
        new ArrayBuffer(16 * 1024 * 1024)
      );
      image.dispose();
    }
    jsGC();
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function bindAndRebindAlias(
  file: RiveFile,
  ref: RiveViewRef,
  health: number
): Promise<ViewModelInstance> {
  const vm = await file.defaultArtboardViewModelAsync();
  const original = (await vm!.createDefaultInstanceAsync())!;
  original.numberProperty('health')!.set(health);
  ref.bindViewModelInstance(original);
  let alias: ViewModelInstance | undefined;
  await waitFor(
    async () => {
      alias = ref.getViewModelInstance() ?? undefined;
      expect(await alias?.numberProperty('health')?.getValueAsync()).toBe(
        health
      );
    },
    { timeout: 5000 }
  );
  ref.bindViewModelInstance(alias!);
  return alias!;
}

// Created outside the helpers below: a callback created inside one shares its scope, which would keep the
// child instance reachable from the native listener.
const pushTo = (values: string[]) => (value: string) => {
  values.push(value);
};

// Return only unsubscribe functions, so JS holds no reference to the child instance or its properties.
async function listenOnPet(
  parent: ViewModelInstance,
  names: string[],
  types: string[]
): Promise<Array<() => void>> {
  const pet = (await parent.viewModelAsync('pet'))!;
  return [
    pet.stringProperty('name')!.addListener(pushTo(names)),
    pet.enumProperty('type')!.addListener(pushTo(types)),
  ];
}

async function listenOnListItemName(
  parent: ViewModelInstance,
  names: string[]
): Promise<Array<() => void>> {
  const item = (await parent.listProperty('team')!.getInstanceAtAsync(0))!;
  return [item.stringProperty('name')!.addListener(pushTo(names))];
}

async function expectToReceive(values: string[], expected: string) {
  await waitFor(() => expect(values).toContain(expected), { timeout: 5000 });
}

async function loadUnreferencedFile() {
  await RiveFileFactory.fromSource(QUICK_START, undefined);
}

describe('JVM finalizers keep in-use native objects open', () => {
  // Control: without it the test below also passes when nothing is ever finalized.
  it('an unreferenced file is finalized', async () => {
    if (!isAndroidExperimental()) return;

    const messages: string[] = [];
    RiveLog.setLogLevel('debug');
    RiveLog.setHandler((_level, tag, message) => {
      if (tag === 'HybridRiveFile') messages.push(message);
    });
    try {
      const finalized = () =>
        messages.some((m) => m.includes('garbage collected without dispose'));
      await loadUnreferencedFile();
      await collectGarbage(finalized);
      await waitFor(() => expect(finalized()).toBe(true), { timeout: 5000 });
    } finally {
      RiveLog.resetHandler();
      RiveLog.setLogLevel('warn');
    }
  });

  it('a rebound view alias keeps the original instance open', async () => {
    if (!isAndroidExperimental()) return;

    const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
    let ref: RiveViewRef | null = null;
    let error: string | null = null;

    try {
      await render(
        <View style={{ width: 200, height: 200 }}>
          <RiveView
            hybridRef={{ f: (r: RiveViewRef | null) => (ref = r) }}
            style={{ flex: 1 }}
            file={file}
            dataBind={DataBindMode.None}
            fit={Fit.Contain}
            onError={(e) => (error = e.message)}
          />
        </View>
      );
      await waitFor(() => expect(ref).not.toBeNull(), { timeout: 5000 });
      await ref!.awaitViewReady();

      const alias = await bindAndRebindAlias(file, ref!, 42);
      await collectGarbage();

      const health = alias.numberProperty('health')!;
      expect(await withTimeout(health.getValueAsync(), 3000)).toBe(42);
      health.set(7);
      expect(await withTimeout(health.getValueAsync(), 3000)).toBe(7);
      expect(error).toBeNull();
    } finally {
      cleanup();
    }
  });
});

describe('JVM finalizers keep instances with property listeners open', () => {
  it('a listener on a nested instance keeps firing after GC', async () => {
    if (!isAndroidExperimental()) return;

    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const parent = file
      .viewModelByName('Person')!
      .createInstanceByName('Gordon')!;
    const names: string[] = [];
    const types: string[] = [];
    const unsubscribers = await listenOnPet(parent, names, types);
    try {
      const name = parent.stringProperty('pet/name')!;
      const type = parent.enumProperty('pet/type')!;
      name.set('Before GC');
      await expectToReceive(names, 'Before GC');

      await collectGarbage();

      name.set('After GC');
      type.set('owl');
      await expectToReceive(names, 'After GC');
      await expectToReceive(types, 'owl');
    } finally {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    }
  });

  it('a listener on a list item keeps firing after GC', async () => {
    if (!isAndroidExperimental()) return;

    const file = await RiveFileFactory.fromSource(DATABINDING_LISTS, undefined);
    const parent = file.viewModelByName('DevRel')!.createDefaultInstance()!;
    const names: string[] = [];
    const unsubscribers = await listenOnListItemName(parent, names);
    try {
      const list = parent.listProperty('team')!;
      const setFirstName = async (value: string) =>
        (await list.getInstanceAtAsync(0))!
          .stringProperty('name')!
          .setValueAsync(value);

      await setFirstName('Before GC');
      await expectToReceive(names, 'Before GC');

      await collectGarbage();

      await setFirstName('After GC');
      await expectToReceive(names, 'After GC');
    } finally {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    }
  });
});
