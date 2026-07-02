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
  Fit,
  RiveFileFactory,
  RiveView,
  useRiveTrigger,
  type RiveFile,
  type RiveViewRef,
} from '@rive-app/react-native';
import type { ViewModelInstance } from '@rive-app/react-native';

const DATABINDING = require('../assets/rive/databinding.riv');

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

async function loadGordonInstance() {
  const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
  const vm = file.viewModelByName('Person');
  expectDefined(vm);
  const instance = vm.createInstanceByName('Gordon');
  expectDefined(instance);
  return { file, instance };
}

// ─── Test context types ────────────────────────────────────────────

type TriggerContext = {
  triggerCount: number;
  triggerFn: (() => void) | null;
  error: Error | null;
  renderCount: number;
  rerender: (() => void) | null;
  ref: RiveViewRef | null;
};

function createTriggerContext(): TriggerContext {
  return {
    triggerCount: 0,
    triggerFn: null,
    error: null,
    renderCount: 0,
    rerender: null,
    ref: null,
  };
}

async function waitForViewReady(context: TriggerContext): Promise<void> {
  await waitFor(
    () => {
      expect(context.ref).not.toBeNull();
    },
    { timeout: 5000 }
  );
  await context.ref!.awaitViewReady();
}

// ─── Test component: stable callback ───────────────────────────────
// RiveView with dataBind is required so the Rive render loop runs
// and pollChanges() dispatches trigger events to listeners.

function StableTriggerComponent({
  file,
  instance,
  context,
}: {
  file: RiveFile;
  instance: ViewModelInstance;
  context: TriggerContext;
}) {
  context.renderCount++;

  const { trigger, error } = useRiveTrigger('jump', instance, {
    onTrigger: () => {
      context.triggerCount++;
    },
  });

  useEffect(() => {
    context.triggerFn = trigger;
    context.error = error;
  }, [context, trigger, error]);

  return (
    <View style={{ width: 200, height: 200 }}>
      <RiveView
        hybridRef={{
          f: (ref: RiveViewRef | null) => {
            context.ref = ref;
          },
        }}
        file={file}
        fit={Fit.Contain}
        dataBind={instance}
        style={{ flex: 1 }}
      />
    </View>
  );
}

// ─── Test component: unstable callback (issue #230) ────────────────

function UnstableTriggerComponent({
  file,
  instance,
  context,
}: {
  file: RiveFile;
  instance: ViewModelInstance;
  context: TriggerContext;
}) {
  'use no memo';

  const [, setTick] = useState(0);
  context.renderCount++;

  const onTrigger = () => {
    context.triggerCount++;
  };

  const { trigger, error } = useRiveTrigger('jump', instance, { onTrigger });

  useEffect(() => {
    context.triggerFn = trigger;
    context.error = error;
  }, [context, trigger, error]);

  // Re-render on demand so the test can change the callback identity deterministically.
  useEffect(() => {
    context.rerender = () => setTick((t) => t + 1);
  }, [context]);

  // Regression guard: block the JS thread at mount (as RiveView init does) to starve any
  // re-render driver. The old setInterval-based version flaked here (renderCount stuck at 2);
  // the deterministic re-renders above survive it.
  useEffect(() => {
    const end = Date.now() + 500;
    while (Date.now() < end) {
      /* simulate heavy mount-time work */
    }
  }, []);

  return (
    <View style={{ width: 200, height: 200 }}>
      <RiveView
        hybridRef={{
          f: (ref: RiveViewRef | null) => {
            context.ref = ref;
          },
        }}
        file={file}
        fit={Fit.Contain}
        dataBind={instance}
        style={{ flex: 1 }}
      />
    </View>
  );
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('useRiveTrigger hook', () => {
  it('receives trigger events from JS trigger()', async () => {
    const { file, instance } = await loadGordonInstance();
    const context = createTriggerContext();

    await render(
      <StableTriggerComponent
        file={file}
        instance={instance}
        context={context}
      />
    );

    await waitFor(
      () => {
        expect(context.triggerFn).not.toBeNull();
      },
      { timeout: 3000 }
    );

    expect(context.error).toBeNull();

    // Wait for the experimental backend's view to be ready before firing.
    await waitForViewReady(context);

    // Fire trigger and wait for it — pollChanges() runs on frame ticks,
    // so we wait for each trigger individually to avoid coalescing.
    context.triggerFn!();

    await waitFor(
      () => {
        expect(context.triggerCount).toBeGreaterThanOrEqual(1);
      },
      { timeout: 5000 }
    );

    cleanup();
  });

  it('receives triggers with unstable callback after re-renders (#230)', async () => {
    const { file, instance } = await loadGordonInstance();
    const context = createTriggerContext();

    await render(
      <UnstableTriggerComponent
        file={file}
        instance={instance}
        context={context}
      />
    );

    await waitFor(
      () => {
        expect(context.rerender).not.toBeNull();
      },
      { timeout: 3000 }
    );

    // Re-render several times to churn the callback identity.
    for (let i = 0; i < 3; i++) {
      context.rerender!();
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(context.renderCount).toBeGreaterThanOrEqual(3);

    await waitFor(
      () => {
        expect(context.triggerFn).not.toBeNull();
      },
      { timeout: 3000 }
    );

    expect(context.error).toBeNull();

    // Wait for the experimental backend's view to be ready before firing.
    await waitForViewReady(context);

    // Fire trigger AFTER the re-render burst — before the fix, this was lost
    context.triggerFn!();

    await waitFor(
      () => {
        expect(context.triggerCount).toBeGreaterThanOrEqual(1);
      },
      { timeout: 5000 }
    );

    cleanup();
  });
});
