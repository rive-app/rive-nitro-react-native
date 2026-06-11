import { describe, it, expect } from 'react-native-harness';
import { Platform } from 'react-native';
import type { ViewModelInstance } from '@rive-app/react-native';
import { RiveFileFactory } from '@rive-app/react-native';

const DATABINDING = require('../assets/rive/databinding.riv');

function isExperimental() {
  return RiveFileFactory.getBackend() === 'experimental';
}

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

async function createGordonInstance(): Promise<ViewModelInstance> {
  const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
  const vm = file.viewModelByName('Person');
  expectDefined(vm);
  const instance = vm.createInstanceByName('Gordon');
  expectDefined(instance);
  return instance;
}

/* eslint-disable no-bitwise */
function getRGB(color: number): { r: number; g: number; b: number } {
  return {
    r: (color >> 16) & 0xff,
    g: (color >> 8) & 0xff,
    b: color & 0xff,
  };
}
/* eslint-enable no-bitwise */

describe('ViewModel Properties', () => {
  it('backend property is accessible', () => {
    const backend = RiveFileFactory.getBackend();
    expect(typeof backend).toBe('string');
    expect(['legacy', 'experimental']).toContain(backend);
  });

  it('numberProperty get/set works', async () => {
    const instance = await createGordonInstance();
    const ageProperty = instance.numberProperty('age');
    expectDefined(ageProperty);
    expect(ageProperty.value).toBe(30);

    ageProperty.value = 33;
    expect(ageProperty.value).toBe(33);
  });

  it('stringProperty get/set works', async () => {
    const instance = await createGordonInstance();
    const nameProperty = instance.stringProperty('name');
    expectDefined(nameProperty);
    expect(nameProperty.value).toBe('Gordon');

    nameProperty.value = 'Peter';
    expect(nameProperty.value).toBe('Peter');
  });

  it('booleanProperty get/set works', async () => {
    const instance = await createGordonInstance();
    const booleanProperty = instance.booleanProperty('likes_popcorn');
    expectDefined(booleanProperty);
    expect(booleanProperty.value).toBe(false);

    booleanProperty.value = true;
    expect(booleanProperty.value).toBe(true);
  });

  it('colorProperty get/set works', async () => {
    const instance = await createGordonInstance();
    const colorProperty = instance.colorProperty('favourite_color');
    expectDefined(colorProperty);

    const initialRGB = getRGB(colorProperty.value);
    expect(initialRGB).toEqual({ r: 255, g: 0, b: 0 });

    colorProperty.value = 0xff00ff00;
    const newRGB = getRGB(colorProperty.value);
    expect(newRGB).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('enumProperty get/set works', async () => {
    const instance = await createGordonInstance();
    const enumProperty = instance.enumProperty('favourite_pet');
    expectDefined(enumProperty);
    expect(enumProperty.value).toBe('dog');

    enumProperty.value = 'cat';
    expect(enumProperty.value).toBe('cat');

    enumProperty.value = 'snakeLizard';
    // Most backends reject invalid enum values; the value should revert to 'cat'
    // Android legacy SDK accepts them (reads back 'snakeLizard')
    const val = enumProperty.value;
    if (
      Platform.OS === 'android' &&
      RiveFileFactory.getBackend() === 'legacy'
    ) {
      expect(val === 'cat' || val === 'snakeLizard').toBe(true);
    } else {
      expect(val).toBe('cat');
    }
  });

  it('triggerProperty can be triggered', async () => {
    const instance = await createGordonInstance();
    const triggerProperty = instance.triggerProperty('jump');
    expectDefined(triggerProperty);

    expect(() => triggerProperty.trigger()).not.toThrow();
  });

  it('nested viewModel property access works', async () => {
    const instance = await createGordonInstance();
    const petViewModel = await instance.viewModelAsync('pet');
    expectDefined(petViewModel);

    const petName = petViewModel.stringProperty('name');
    expectDefined(petName);
    expect(petName.value).toBe('Jameson');

    const petType = petViewModel.enumProperty('type');
    expectDefined(petType);
    expect(petType.value).toBe('frog');

    petType.value = 'chipmunk';
    expect(petType.value).toBe('chipmunk');
  });

  it('nested path property access works', async () => {
    const instance = await createGordonInstance();
    const nestedStringProperty = instance.stringProperty('pet/name');
    const nestedEnumProperty = instance.enumProperty('pet/type');

    expectDefined(nestedStringProperty);
    expectDefined(nestedEnumProperty);

    expect(nestedStringProperty.value).toBe('Jameson');
    expect(nestedEnumProperty.value).toBe('frog');

    nestedStringProperty.value = 'Max';
    nestedEnumProperty.value = 'owl';

    expect(nestedStringProperty.value).toBe('Max');
    expect(nestedEnumProperty.value).toBe('owl');
  });

  it('non-existent properties return undefined', async () => {
    if (isExperimental()) {
      // Experimental backends return wrapper objects for any path — validity is
      // checked lazily when a value is read (getValueAsync throws).
      return;
    }

    const instance = await createGordonInstance();

    expect(instance.numberProperty('nonexistent')).toBeUndefined();
    expect(instance.stringProperty('nonexistent')).toBeUndefined();
    expect(instance.booleanProperty('nonexistent')).toBeUndefined();
    expect(instance.colorProperty('nonexistent')).toBeUndefined();
    expect(instance.enumProperty('nonexistent')).toBeUndefined();
    expect(instance.triggerProperty('nonexistent')).toBeUndefined();
    expect(await instance.viewModelAsync('nonexistent')).toBeUndefined();
  });

  it('experimental: getValueAsync throws for non-existent property path', async () => {
    if (!isExperimental()) {
      return;
    }

    const instance = await createGordonInstance();

    await expect(
      instance.numberProperty('nonexistent')!.getValueAsync()
    ).rejects.toBeDefined();

    await expect(
      instance.stringProperty('nonexistent')!.getValueAsync()
    ).rejects.toBeDefined();

    await expect(
      instance.booleanProperty('nonexistent')!.getValueAsync()
    ).rejects.toBeDefined();

    await expect(
      instance.colorProperty('nonexistent')!.getValueAsync()
    ).rejects.toBeDefined();

    await expect(
      instance.enumProperty('nonexistent')!.getValueAsync()
    ).rejects.toBeDefined();
  });
});

describe('Property Listeners', () => {
  it('numberProperty addListener returns cleanup function', async () => {
    const instance = await createGordonInstance();
    const prop = instance.numberProperty('age');
    expectDefined(prop);

    const cleanup = prop.addListener(() => {});
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('stringProperty addListener returns cleanup function', async () => {
    const instance = await createGordonInstance();
    const prop = instance.stringProperty('name');
    expectDefined(prop);

    const cleanup = prop.addListener(() => {});
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('booleanProperty addListener returns cleanup function', async () => {
    const instance = await createGordonInstance();
    const prop = instance.booleanProperty('likes_popcorn');
    expectDefined(prop);

    const cleanup = prop.addListener(() => {});
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('colorProperty addListener returns cleanup function', async () => {
    const instance = await createGordonInstance();
    const prop = instance.colorProperty('favourite_color');
    expectDefined(prop);

    const cleanup = prop.addListener(() => {});
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('enumProperty addListener returns cleanup function', async () => {
    const instance = await createGordonInstance();
    const prop = instance.enumProperty('favourite_pet');
    expectDefined(prop);

    const cleanup = prop.addListener(() => {});
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('triggerProperty addListener returns cleanup function', async () => {
    const instance = await createGordonInstance();
    const prop = instance.triggerProperty('jump');
    expectDefined(prop);

    const cleanup = prop.addListener(() => {});
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('removeListeners does not throw', async () => {
    const instance = await createGordonInstance();
    const prop = instance.numberProperty('age');
    expectDefined(prop);

    prop.addListener(() => {});
    prop.addListener(() => {});

    expect(() => prop.removeListeners()).not.toThrow();
  });

  it('multiple addListener calls return independent cleanup functions', async () => {
    const instance = await createGordonInstance();
    const prop = instance.numberProperty('age');
    expectDefined(prop);

    const cleanup1 = prop.addListener(() => {});
    const cleanup2 = prop.addListener(() => {});

    expect(cleanup1).not.toBe(cleanup2);
    expect(() => cleanup1()).not.toThrow();
    expect(() => cleanup2()).not.toThrow();
  });
});

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Listener callback invocation (experimental only)', () => {
  // The experimental backend emits the current value on addListener;
  // legacy only fires on subsequent changes — these tests would hang.
  it('numberProperty listener emits current value', async () => {
    if (!isExperimental()) return;
    const instance = await createGordonInstance();
    const prop = instance.numberProperty('age');
    expectDefined(prop);
    const value = await new Promise<number>((resolve) => {
      const cleanup = prop.addListener((v) => {
        cleanup();
        resolve(v);
      });
    });
    expect(value).toBe(30);
  });

  it('stringProperty listener emits current value', async () => {
    if (!isExperimental()) return;
    const instance = await createGordonInstance();
    const prop = instance.stringProperty('name');
    expectDefined(prop);
    const value = await new Promise<string>((resolve) => {
      const cleanup = prop.addListener((v) => {
        cleanup();
        resolve(v);
      });
    });
    expect(value).toBe('Gordon');
  });

  it('booleanProperty listener emits current value', async () => {
    if (!isExperimental()) return;
    const instance = await createGordonInstance();
    const prop = instance.booleanProperty('likes_popcorn');
    expectDefined(prop);
    const value = await new Promise<boolean>((resolve) => {
      const cleanup = prop.addListener((v) => {
        cleanup();
        resolve(v);
      });
    });
    expect(value).toBe(false);
  });

  it('colorProperty listener emits current value', async () => {
    if (!isExperimental()) return;
    const instance = await createGordonInstance();
    const prop = instance.colorProperty('favourite_color');
    expectDefined(prop);
    const value = await new Promise<number>((resolve) => {
      const cleanup = prop.addListener((v) => {
        cleanup();
        resolve(v);
      });
    });
    const rgb = getRGB(value);
    expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('enumProperty listener emits current value', async () => {
    if (!isExperimental()) return;
    const instance = await createGordonInstance();
    const prop = instance.enumProperty('favourite_pet');
    expectDefined(prop);
    const value = await new Promise<string>((resolve) => {
      const cleanup = prop.addListener((v) => {
        cleanup();
        resolve(v);
      });
    });
    expect(value).toBe('dog');
  });
});

describe('set() method works for all property types', () => {
  it('numberProperty set() updates value', async () => {
    const instance = await createGordonInstance();
    const prop = instance.numberProperty('age');
    expectDefined(prop);
    prop.set(99);
    await delay(100);
    expect(await prop.getValueAsync()).toBe(99);
  });

  it('stringProperty set() updates value', async () => {
    const instance = await createGordonInstance();
    const prop = instance.stringProperty('name');
    expectDefined(prop);
    prop.set('Alice');
    await delay(100);
    expect(await prop.getValueAsync()).toBe('Alice');
  });

  it('booleanProperty set() updates value', async () => {
    const instance = await createGordonInstance();
    const prop = instance.booleanProperty('likes_popcorn');
    expectDefined(prop);
    prop.set(true);
    await delay(100);
    expect(await prop.getValueAsync()).toBe(true);
  });

  it('colorProperty set() updates value', async () => {
    const instance = await createGordonInstance();
    const prop = instance.colorProperty('favourite_color');
    expectDefined(prop);
    prop.set(0xff00ff00);
    await delay(100);
    const rgb = getRGB(await prop.getValueAsync());
    expect(rgb).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('enumProperty set() updates value', async () => {
    const instance = await createGordonInstance();
    const prop = instance.enumProperty('favourite_pet');
    expectDefined(prop);
    prop.set('cat');
    await delay(100);
    expect(await prop.getValueAsync()).toBe('cat');
  });

  it('triggerProperty trigger() does not throw', async () => {
    const instance = await createGordonInstance();
    const prop = instance.triggerProperty('jump');
    expectDefined(prop);
    prop.trigger();
    await delay(100);
  });
});

describe('set() + getValueAsync() round-trip', () => {
  it('booleanProperty set + getValueAsync', async () => {
    const instance = await createGordonInstance();
    const prop = instance.booleanProperty('likes_popcorn');
    expectDefined(prop);
    prop.set(true);
    await delay(100);
    expect(await prop.getValueAsync()).toBe(true);
  });

  it('colorProperty set + getValueAsync', async () => {
    const instance = await createGordonInstance();
    const prop = instance.colorProperty('favourite_color');
    expectDefined(prop);
    prop.set(0xff0000ff);
    await delay(100);
    const rgb = getRGB(await prop.getValueAsync());
    expect(rgb).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('enumProperty set + getValueAsync', async () => {
    const instance = await createGordonInstance();
    const prop = instance.enumProperty('favourite_pet');
    expectDefined(prop);
    prop.set('cat');
    await delay(100);
    expect(await prop.getValueAsync()).toBe('cat');
  });
});

describe('removeListeners stops callbacks', () => {
  it('no callbacks fire after removeListeners', async () => {
    const instance = await createGordonInstance();
    const prop = instance.numberProperty('age');
    expectDefined(prop);
    const values: number[] = [];
    prop.addListener((v) => values.push(v));
    await delay(200);
    const countBefore = values.length;
    prop.removeListeners();
    prop.set(999);
    await delay(300);
    expect(values.length).toBe(countBefore);
  });
});
