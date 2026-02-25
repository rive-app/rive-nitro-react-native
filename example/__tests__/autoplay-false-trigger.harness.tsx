import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { useEffect } from 'react';
import { View } from 'react-native';
import {
  RiveView,
  RiveFileFactory,
  Fit,
  type RiveFile,
  type RiveViewRef,
} from '@rive-app/react-native';
import type { ViewModelInstance } from '@rive-app/react-native';

// quick_start.riv has:
//   - "health" number property (default 50)
//   - "gameOver" trigger property
//   - state machine named "State Machine 1"
const QUICK_START = require('../assets/rive/quick_start.riv');

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

type TestContext = {
  ref: RiveViewRef | null;
  error: string | null;
};

function AutoPlayFalseView({
  file,
  instance,
  context,
}: {
  file: RiveFile;
  instance: ViewModelInstance;
  context: TestContext;
}) {
  useEffect(() => {
    return () => {
      context.ref = null;
    };
  }, [context]);

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
        autoPlay={false}
        dataBind={instance}
        fit={Fit.Contain}
        stateMachineName="State Machine 1"
        onError={(e) => {
          context.error = e.message;
        }}
      />
    </View>
  );
}

async function loadQuickStart() {
  const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
  const vm = file.defaultArtboardViewModel();
  expectDefined(vm);
  const instance = vm.createDefaultInstance();
  expectDefined(instance);
  return { file, instance };
}

describe('autoPlay={false} + dataBind (issue #156)', () => {
  it('VMI is bound to state machine without play()', async () => {
    const { file, instance } = await loadQuickStart();
    const context: TestContext = { ref: null, error: null };

    const health = instance.numberProperty('health');
    expectDefined(health);
    health.value = 25;

    await render(
      <AutoPlayFalseView file={file} instance={instance} context={context} />
    );

    await waitFor(
      () => {
        expect(context.ref).not.toBeNull();
      },
      { timeout: 5000 }
    );

    await context.ref!.awaitViewReady();

    // Without fix: getViewModelInstance() returns null because
    // the SDK never created state machines (autoPlay=false, no autoBind)
    const boundVmi = context.ref!.getViewModelInstance();
    expect(boundVmi).not.toBeNull();

    // The health value we set should be readable
    const boundHealth = boundVmi!.numberProperty('health');
    expectDefined(boundHealth);
    expect(boundHealth.value).toBe(25);

    expect(context.error).toBeNull();
    cleanup();
  });
});
