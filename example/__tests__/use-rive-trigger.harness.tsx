import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { RiveFileFactory, useRiveTrigger } from '@rive-app/react-native';
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

function StableTriggerComponent({
  instance,
  context,
}: {
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
    <View>
      <Text>{context.triggerCount}</Text>
    </View>
  );
}

// ─── Test component: unstable callback (issue #230) ────────────────
// 'use no memo' simulates components without React Compiler where
// the onTrigger callback is a new reference every render.

function UnstableTriggerComponent({
  instance,
  context,
}: {
  instance: ViewModelInstance;
  context: TriggerContext;
}) {
  'use no memo';

  const [, setTick] = useState(0);
  context.renderCount++;

  // New reference every render — this is the pattern that triggered #230
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
    <View>
      <Text>{context.triggerCount}</Text>
    </View>
  );
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('useRiveTrigger hook', () => {
  it('receives trigger events from JS trigger()', async () => {
    const { instance } = await loadGordonInstance();
    const context = createTriggerContext();

    await render(
      <StableTriggerComponent instance={instance} context={context} />
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
      { timeout: 3000 }
    );

    cleanup();
  });

  it('receives triggers with unstable callback after re-renders (#230)', async () => {
    const { instance } = await loadGordonInstance();
    const context = createTriggerContext();

    await render(
      <UnstableTriggerComponent instance={instance} context={context} />
    );

    // Wait for the re-render burst to complete (300ms of re-renders every 50ms)
    await waitFor(
      () => {
        expect(context.renderCount).toBeGreaterThan(5);
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
      { timeout: 3000 }
    );

    // Fire more to confirm stability
    context.triggerFn!();
    context.triggerFn!();

    await waitFor(
      () => {
        expect(context.triggerCount).toBeGreaterThanOrEqual(3);
      },
      { timeout: 3000 }
    );

    cleanup();
  });
});
