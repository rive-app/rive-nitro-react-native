import { describe, it, expect } from 'react-native-harness';
import type {
  ViewModelInstance,
  RiveEnumDefinition,
} from '@rive-app/react-native';
import { RiveFileFactory } from '@rive-app/react-native';

const DATABINDING = require('../assets/rive/databinding.riv');

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
    expect(enumProperty.value).toBe('cat');
  });

  it('triggerProperty can be triggered', async () => {
    const instance = await createGordonInstance();
    const triggerProperty = instance.triggerProperty('jump');
    expectDefined(triggerProperty);

    expect(() => triggerProperty.trigger()).not.toThrow();
  });

  it('nested viewModel property access works', async () => {
    const instance = await createGordonInstance();
    const petViewModel = instance.viewModel('pet');
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
    const instance = await createGordonInstance();

    expect(instance.numberProperty('nonexistent')).toBeUndefined();
    expect(instance.stringProperty('nonexistent')).toBeUndefined();
    expect(instance.booleanProperty('nonexistent')).toBeUndefined();
    expect(instance.colorProperty('nonexistent')).toBeUndefined();
    expect(instance.enumProperty('nonexistent')).toBeUndefined();
    expect(instance.triggerProperty('nonexistent')).toBeUndefined();
    expect(instance.viewModel('nonexistent')).toBeUndefined();
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

describe('RiveFile Enums', () => {
  const expectedEnums: RiveEnumDefinition[] = [
    { name: 'Pets', values: ['chipmunk', 'rat', 'frog', 'owl', 'cat', 'dog'] },
  ];

  it('getEnums returns enum definitions from file', async () => {
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const enums = await file.getEnums();

    expect(enums.length).toBe(expectedEnums.length);
    expect(enums[0]?.name).toBe(expectedEnums[0]?.name);
    expect(enums[0]?.values).toEqual(expectedEnums[0]?.values);
  });
});
