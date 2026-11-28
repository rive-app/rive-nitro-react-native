import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  RiveView,
  RiveFileFactory,
  Fit,
  type RiveFile,
  type RiveViewRef,
  type ViewModelInstance,
} from '@rive-app/react-native';

// Ticker { phase }: a looping animation bound to phase, so every advance of the
// state machine updates it. Source: example/assets/rive-src/settle_probe
const SETTLE_PROBE = require('../assets/rive/settle_probe.riv');

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

type TestContext = {
  file: RiveFile;
  ref: RiveViewRef | null;
  setPaused: ((paused: boolean) => void) | null;
  updates: number;
};

function PausedView({
  file,
  instance,
  initialPaused,
  context,
}: {
  file: RiveFile;
  instance: ViewModelInstance;
  initialPaused: boolean;
  context: TestContext;
}) {
  const [paused, setPaused] = useState(initialPaused);

  useEffect(() => {
    context.setPaused = setPaused;
    const phase = instance.numberProperty('phase');
    const remove = phase?.addListener(() => {
      context.updates += 1;
    });
    return () => {
      remove?.();
      phase?.dispose();
      context.setPaused = null;
    };
  }, [context, instance]);

  return (
    <View style={{ width: 160, height: 160 }}>
      <RiveView
        hybridRef={{
          f: (ref: RiveViewRef | null) => {
            context.ref = ref;
          },
        }}
        style={{ flex: 1 }}
        file={file}
        artboardName="Ticker"
        dataBind={instance}
        paused={paused}
        fit={Fit.Contain}
      />
    </View>
  );
}

async function renderTicker(initialPaused: boolean) {
  const file = await RiveFileFactory.fromSource(SETTLE_PROBE, undefined);
  const vm = await file.viewModelByNameAsync('Ticker');
  expectDefined(vm);
  const instance = await vm.createDefaultInstanceAsync();
  expectDefined(instance);
  const context: TestContext = {
    file,
    ref: null,
    setPaused: null,
    updates: 0,
  };
  await render(
    <PausedView
      file={file}
      instance={instance}
      initialPaused={initialPaused}
      context={context}
    />
  );
  await waitFor(
    () => {
      expect(context.ref).not.toBeNull();
      expect(context.setPaused).not.toBeNull();
    },
    { timeout: 5000 }
  );
  return context;
}

// Lets in-flight updates drain, then counts the ones arriving within the window.
async function updatesWithin(context: TestContext, ms = 800) {
  await delay(200);
  const start = context.updates;
  await delay(ms);
  return context.updates - start;
}

async function waitForUpdates(context: TestContext) {
  const start = context.updates;
  await waitFor(
    () => {
      expect(context.updates - start).toBeGreaterThan(0);
    },
    { timeout: 5000 }
  );
}

describe('paused prop', () => {
  it('stops updates while paused and resumes when unpaused', async () => {
    const context = await renderTicker(false);
    await waitForUpdates(context);

    context.setPaused!(true);
    expect(await updatesWithin(context)).toBe(0);

    context.setPaused!(false);
    await waitForUpdates(context);

    cleanup();
  });

  it('wins over play() and does not undo an earlier pause()', async () => {
    const context = await renderTicker(false);
    await waitForUpdates(context);

    await context.ref!.pause();
    context.setPaused!(true);
    await context.ref!.play();
    expect(await updatesWithin(context)).toBe(0);

    await context.ref!.pause();
    context.setPaused!(false);
    expect(await updatesWithin(context)).toBe(0);

    await context.ref!.play();
    await waitForUpdates(context);

    cleanup();
  });

  it('resolves view ready when mounted paused, then resumes', async () => {
    const context = await renderTicker(true);

    expect(await context.ref!.awaitViewReady()).toBe(true);
    expect(await updatesWithin(context)).toBe(0);

    context.setPaused!(false);
    await waitForUpdates(context);

    cleanup();
  });

  it('applies paused after the file wrapper is disposed', async () => {
    const context = await renderTicker(false);
    await waitForUpdates(context);

    // Throws after disposing because dev builds freeze props (nitro#1083).
    try {
      context.file.dispose();
    } catch {}
    context.setPaused!(true);
    expect(await updatesWithin(context)).toBe(0);

    cleanup();
  });
});
