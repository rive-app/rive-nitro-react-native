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

function UseRiveNumberTestComponent({
  instance,
}: {
  instance: ViewModelInstance;
}) {
  const { value, error } = useRiveNumber('health', instance);

  useEffect(() => {
    capturedValue = value;
    capturedError = error;
  }, [value, error]);

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
});
