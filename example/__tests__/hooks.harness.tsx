import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import {
  RiveFileFactory,
  useRiveNumber,
  useViewModelInstance,
  type RiveFile,
} from '@rive-app/react-native';
import type { ViewModelInstance } from '@rive-app/react-native';

const DATABINDING = require('../assets/rive/databinding.riv');

type UseRiveNumberContext = {
  value: number | undefined;
  error: Error | null;
  setValue: ((v: number) => void) | null;
};

function createUseRiveNumberContext(): UseRiveNumberContext {
  return { value: undefined, error: null, setValue: null };
}

type UseViewModelInstanceContext = {
  instance: ViewModelInstance | null;
  age: number | undefined;
};

function createUseViewModelInstanceContext(): UseViewModelInstanceContext {
  return { instance: null, age: undefined };
}

function UseRiveNumberTestComponent({
  instance,
  context,
}: {
  instance: ViewModelInstance;
  context: UseRiveNumberContext;
}) {
  const { value, setValue, error } = useRiveNumber('age', instance);

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

function UseViewModelInstanceTestComponent({
  file,
  context,
}: {
  file: RiveFile;
  context: UseViewModelInstanceContext;
}) {
  const instance = useViewModelInstance(file);

  const age = useMemo(() => {
    if (!instance) return undefined;
    return instance.numberProperty('age')?.value;
  }, [instance]);

  useEffect(() => {
    context.instance = instance;
    context.age = age;
  }, [context, instance, age]);

  return (
    <View>
      <Text>
        instance={String(!!instance)} age={String(age)}
      </Text>
    </View>
  );
}

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

describe('useRiveNumber Hook', () => {
  it('returns value from number property', async () => {
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const vm = file.viewModelByName('Person');
    expectDefined(vm);
    const instance = vm.createInstanceByName('Gordon');
    expectDefined(instance);

    const context = createUseRiveNumberContext();
    try {
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
    } finally {
      cleanup();
    }
  });

  it('can set value via setValue', async () => {
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const vm = file.viewModelByName('Person');
    expectDefined(vm);
    const instance = vm.createInstanceByName('Gordon');
    expectDefined(instance);

    const context = createUseRiveNumberContext();
    try {
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

      const property = instance.numberProperty('age');
      expectDefined(property);
      expect(property.value).toBe(42);
    } finally {
      cleanup();
    }
  });
});

describe('useViewModelInstance hook', () => {
  it('gets default ViewModel instance from RiveFile', async () => {
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const context = createUseViewModelInstanceContext();

    await render(
      <UseViewModelInstanceTestComponent file={file} context={context} />
    );

    await waitFor(
      () => {
        expect(context.instance).not.toBeNull();
      },
      { timeout: 5000 }
    );

    expect(context.age).toBe(30);

    cleanup();
  });
});
