import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { useEffect } from 'react';
import { ScreenContainer, Screen } from 'react-native-screens';
import {
  RiveView,
  RiveFileFactory,
  Fit,
  type RiveFile,
  type RiveViewRef,
} from '@rive-app/react-native';
import type { ViewModelInstance } from '@rive-app/react-native';

const QUICK_START = require('../assets/rive/quick_start.riv');

const SCREEN_INACTIVE = 0 as const;
const SCREEN_ACTIVE = 2 as const;

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

type TestContext = {
  ref: RiveViewRef | null;
  error: string | null;
};

function ScreenWithRive({
  file,
  instance,
  context,
  activityState,
}: {
  file: RiveFile;
  instance: ViewModelInstance;
  context: TestContext;
  activityState: typeof SCREEN_INACTIVE | typeof SCREEN_ACTIVE;
}) {
  useEffect(() => {
    return () => {
      context.ref = null;
    };
  }, [context]);

  return (
    <ScreenContainer style={{ width: 200, height: 200 }}>
      <Screen activityState={activityState} style={{ flex: 1 }}>
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
      </Screen>
    </ScreenContainer>
  );
}

describe('navigation lifecycle (PR #46)', () => {
  it('RiveView preserves state after screen detach/reattach', async () => {
    const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
    const vm = file.defaultArtboardViewModel();
    expectDefined(vm);
    const instance = vm.createDefaultInstance();
    expectDefined(instance);

    const context: TestContext = { ref: null, error: null };

    const { rerender } = await render(
      <ScreenWithRive
        file={file}
        instance={instance}
        context={context}
        activityState={SCREEN_ACTIVE}
      />
    );

    await waitFor(
      () => {
        expect(context.ref).not.toBeNull();
      },
      { timeout: 5000 }
    );
    await context.ref!.awaitViewReady();

    // Set health to 75 via the native view's VMI
    const boundVmi = context.ref!.getViewModelInstance();
    expectDefined(boundVmi);
    const health = boundVmi.numberProperty('health');
    expectDefined(health);
    health.value = 75;

    // Detach screen (simulates navigating away — triggers onDetachedFromWindow)
    await rerender(
      <ScreenWithRive
        file={file}
        instance={instance}
        context={context}
        activityState={SCREEN_INACTIVE}
      />
    );
    await new Promise((r) => setTimeout(r, 300));

    // Reattach screen (simulates navigating back)
    await rerender(
      <ScreenWithRive
        file={file}
        instance={instance}
        context={context}
        activityState={SCREEN_ACTIVE}
      />
    );
    await new Promise((r) => setTimeout(r, 300));

    // Query the VMI from the native view after reattach
    expect(context.error).toBeNull();
    const reattachedVmi = context.ref!.getViewModelInstance();
    expectDefined(reattachedVmi);
    const reattachedHealth = reattachedVmi.numberProperty('health');
    expectDefined(reattachedHealth);
    expect(reattachedHealth.value).toBe(75);

    cleanup();
  });
});
