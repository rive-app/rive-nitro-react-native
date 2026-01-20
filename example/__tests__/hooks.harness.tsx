import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { RiveFileFactory, useRiveNumber } from '@rive-app/react-native';
import type { ViewModelInstance } from '@rive-app/react-native';

const QUICK_START = require('../assets/rive/quick_start.riv');

type HookContext = {
  value: number | undefined;
  error: Error | null;
  setValue: ((v: number) => void) | null;
};

function createHookContext(): HookContext {
  return { value: undefined, error: null, setValue: null };
}

function UseRiveNumberTestComponent({
  instance,
  context,
}: {
  instance: ViewModelInstance;
  context: HookContext;
}) {
  const { value, setValue, error } = useRiveNumber('health', instance);

  useEffect(() => {
    context.value = value;
    context.error = error;
    context.setValue = setValue;
  }, [context, value, error, setValue]);

  return (
    <View>
      <Text testID="value">{String(value)}</Text>
    </View>
  );
}

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

describe('useRiveNumber Hook', () => {
  it('returns value from number property', async () => {
    const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
    const vm = file.defaultArtboardViewModel();
    expectDefined(vm);
    const instance = vm.createDefaultInstance();
    expectDefined(instance);

    const context = createHookContext();
    await render(
      <UseRiveNumberTestComponent instance={instance} context={context} />
    );

    await waitFor(
      () => {
        expect(context.error).toBeNull();
        expect(typeof context.value).toBe('number');
      },
      { timeout: 5000 }
    );

    cleanup();
  });

  it('can set value via setValue', async () => {
    const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
    const vm = file.defaultArtboardViewModel();
    expectDefined(vm);
    const instance = vm.createDefaultInstance();
    expectDefined(instance);

    const context = createHookContext();
    await render(
      <UseRiveNumberTestComponent instance={instance} context={context} />
    );

    await waitFor(
      () => {
        expect(context.setValue).not.toBeNull();
      },
      { timeout: 5000 }
    );

    context.setValue!(42);

    const property = instance.numberProperty('health');
    expectDefined(property);
    expect(property.value).toBe(42);

    cleanup();
  });
});
