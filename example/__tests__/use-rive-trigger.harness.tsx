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
};

function createTriggerContext(): TriggerContext {
  return { triggerCount: 0, triggerFn: null, error: null, renderCount: 0 };
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

  // Force re-renders to change callback identity
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 50);
    const timeout = setTimeout(() => clearInterval(interval), 300);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <View style={{ width: 200, height: 200 }}>
      <RiveView
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

    context.triggerFn!();
    context.triggerFn!();
    context.triggerFn!();

    await waitFor(
      () => {
        expect(context.triggerCount).toBeGreaterThanOrEqual(3);
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

    // Wait for the re-render burst to complete (300ms of re-renders every 50ms)
    await waitFor(
      () => {
        expect(context.renderCount).toBeGreaterThanOrEqual(3);
      },
      { timeout: 2000 }
    );

    await waitFor(
      () => {
        expect(context.triggerFn).not.toBeNull();
      },
      { timeout: 3000 }
    );

    expect(context.error).toBeNull();

    // Fire triggers AFTER the re-render burst — before the fix, these were lost
    context.triggerFn!();

    await waitFor(
      () => {
        expect(context.triggerCount).toBeGreaterThanOrEqual(1);
      },
      { timeout: 5000 }
    );

    // Fire more to confirm stability
    context.triggerFn!();
    context.triggerFn!();

    await waitFor(
      () => {
        expect(context.triggerCount).toBeGreaterThanOrEqual(3);
      },
      { timeout: 5000 }
    );

    cleanup();
  });
});
