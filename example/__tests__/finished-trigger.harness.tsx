import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { View } from 'react-native';
import {
  RiveView,
  RiveFileFactory,
  Fit,
  useRiveTrigger,
  type RiveFile,
  type RiveViewRef,
  type ViewModelInstance,
} from '@rive-app/react-native';

// One-shot animation that fires the 'finished' view-model trigger when it
// completes (state machine exit-time transition action) — the data-binding
// replacement for the removed onStop prop.
const FINISHED_TRIGGER = require('../assets/rive/finished_trigger.riv');

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

type TestContext = {
  ref: RiveViewRef | null;
  triggerCount: number;
  error: string | null;
};

function FinishedView({
  file,
  instance,
  context,
}: {
  file: RiveFile;
  instance: ViewModelInstance;
  context: TestContext;
}) {
  useRiveTrigger('finished', instance, {
    onTrigger: () => {
      context.triggerCount++;
    },
  });

  return (
    <View style={{ width: 200, height: 200 }}>
      <RiveView
        hybridRef={{
          f: (ref: RiveViewRef | null) => {
            context.ref = ref;
          },
        }}
        style={{ flex: 1 }}
        file={file}
        autoPlay={true}
        fit={Fit.Contain}
        dataBind={instance}
        onError={(e) => {
          context.error = e.message;
        }}
      />
    </View>
  );
}

describe('finished-trigger.riv', () => {
  it('loads and exposes a view model with a finished trigger', async () => {
    const file = await RiveFileFactory.fromSource(FINISHED_TRIGGER, undefined);
    expectDefined(file);

    const artboards = await file.getArtboardNamesAsync();
    const vmNames = await file.getViewModelNamesAsync();
    console.log(`artboards: ${JSON.stringify(artboards)}`);
    console.log(`viewModels: ${JSON.stringify(vmNames)}`);

    for (const name of vmNames) {
      const vm = await file.viewModelByNameAsync(name);
      expectDefined(vm);
      const props = await vm.getPropertiesAsync();
      console.log(`VM "${name}" properties: ${JSON.stringify(props)}`);
    }

    const vm = await file.defaultArtboardViewModelAsync();
    expectDefined(vm);
    const props = await vm.getPropertiesAsync();
    const finished = props.find((p) => p.name === 'finished');
    expectDefined(finished);
    cleanup();
  });

  it('fires the finished trigger exactly once when the animation completes', async () => {
    const file = await RiveFileFactory.fromSource(FINISHED_TRIGGER, undefined);
    const vm = await file.defaultArtboardViewModelAsync();
    expectDefined(vm);
    const instance = await vm.createDefaultInstanceAsync();
    expectDefined(instance);

    const context: TestContext = { ref: null, triggerCount: 0, error: null };
    const mountedAt = Date.now();
    await render(
      <FinishedView file={file} instance={instance} context={context} />
    );

    await waitFor(() => expect(context.triggerCount).toBeGreaterThan(0), {
      timeout: 10000,
    });

    // The one-shot timeline is ~1s; a fire much earlier means the state
    // machine exited the animation state immediately (e.g. exit time not
    // set to 100% in the editor) instead of at completion.
    const firedAfterMs = Date.now() - mountedAt;
    console.log(`finished trigger fired ${firedAfterMs} ms after mount`);
    expect(firedAfterMs).toBeGreaterThan(500);

    const samples: number[] = [];
    for (let i = 0; i < 3; i++) {
      await delay(1000);
      samples.push(context.triggerCount);
    }
    console.log(`finished trigger count progression: ${samples.join(', ')}`);
    expect(context.error).toBeNull();
    expect(context.triggerCount).toBe(1);
    cleanup();
  });
});
