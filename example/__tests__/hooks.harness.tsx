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

let capturedValue: number | undefined = undefined;
let capturedError: Error | null = null;
let capturedSetValue: ((v: number) => void) | null = null;

function UseRiveNumberTestComponent({
  instance,
}: {
  instance: ViewModelInstance;
}) {
  const { value, setValue, error } = useRiveNumber('health', instance);

  useEffect(() => {
    capturedValue = value;
    capturedError = error;
    capturedSetValue = setValue;
  }, [value, error, setValue]);

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

    capturedValue = undefined;
    capturedError = null;

    await render(<UseRiveNumberTestComponent instance={instance} />);

    await waitFor(
      () => {
        expect(capturedError).toBeNull();
        expect(typeof capturedValue).toBe('number');
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

    capturedValue = undefined;
    capturedError = null;
    capturedSetValue = null;

    await render(<UseRiveNumberTestComponent instance={instance} />);

    // Wait for initial render
    await waitFor(
      () => {
        expect(capturedSetValue).not.toBeNull();
      },
      { timeout: 5000 }
    );

    // Set a new value
    capturedSetValue!(42);

    // Verify the property was set on the native side
    const property = instance.numberProperty('health');
    expectDefined(property);
    expect(property.value).toBe(42);

    cleanup();
  });
});
