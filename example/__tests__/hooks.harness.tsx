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
  useRiveFile,
  useRiveNumber,
  useRiveString,
  useViewModelInstance,
  type RiveFile,
} from '@rive-app/react-native';
import type { ViewModelInstance } from '@rive-app/react-native';

const QUICK_START = require('../assets/rive/quick_start.riv');
const DATABINDING = require('../assets/rive/databinding.riv');
const FONT_FALLBACK = require('../assets/rive/font_fallback.riv');

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
  it('starts undefined then receives value via listener', async () => {
    const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
    const vm = file.defaultArtboardViewModel();
    expectDefined(vm);
    const instance = vm.createDefaultInstance();
    expectDefined(instance);

    const context = createUseRiveNumberContext();

    // Value must start undefined — not synchronously read from property.value
    expect(context.value).toBeUndefined();

    await render(
      <UseRiveNumberTestComponent instance={instance} context={context} />
    );

    // After listener fires, value should be a number
    await waitFor(
      () => {
        expect(context.error).toBeNull();
        expect(typeof context.value).toBe('number');
      },
      { timeout: 5000 }
    );

    cleanup();
  });

  it('returns value from number property', async () => {
    const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
    const vm = file.defaultArtboardViewModel();
    expectDefined(vm);
    const instance = vm.createDefaultInstance();
    expectDefined(instance);

    const context = createUseRiveNumberContext();
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

    const context = createUseRiveNumberContext();
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

class UseRiveStringContext {
  value: string | undefined = undefined;
  error: Error | null = null;
  errorEverSet = false;
  setValue: ((v: string) => void) | null = null;
  setValueCalledBeforeReady = false;
}

/**
 * Loads a riv file via useRiveFile (async) and immediately calls
 * setText in a useEffect — exercising the "setValue before ready" path.
 * See #141 / PR #155 for context.
 */
function UseRiveStringBeforeReadyComponent({
  source,
  context,
}: {
  source: number;
  context: UseRiveStringContext;
}) {
  const { riveFile } = useRiveFile(source);
  const instance = useMemo(
    () => riveFile?.defaultArtboardViewModel()?.createDefaultInstance(),
    [riveFile]
  );

  const { value, setValue, error } = useRiveString('text', instance);

  // Call setValue immediately — before file has loaded on first render
  useEffect(() => {
    if (!instance) {
      context.setValueCalledBeforeReady = true;
    }
    setValue('Harness test');
  }, [setValue, instance, context]);

  useEffect(() => {
    context.value = value;
    context.error = error;
    if (error) context.errorEverSet = true;
    context.setValue = setValue;
  }, [context, value, error, setValue]);

  return (
    <View>
      <Text testID="value">{String(value)}</Text>
      <Text testID="error">{String(error?.message ?? 'none')}</Text>
    </View>
  );
}

describe('useRiveString setValue before ready (#141)', () => {
  it('does not error when setValue is called before instance loads', async () => {
    const context = new UseRiveStringContext();
    await render(
      <UseRiveStringBeforeReadyComponent
        source={FONT_FALLBACK}
        context={context}
      />
    );

    // Wait for file to load and property to resolve
    await waitFor(
      () => {
        expect(context.value).toBeDefined();
      },
      { timeout: 5000 }
    );

    // setValue was called before instance was ready (first render)
    expect(context.setValueCalledBeforeReady).toBe(true);

    // No error should have ever been set — setValue before ready is a silent no-op
    expect(context.errorEverSet).toBe(false);

    cleanup();
  });
});
