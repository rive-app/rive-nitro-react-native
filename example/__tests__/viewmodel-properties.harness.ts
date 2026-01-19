import { describe, it, expect } from 'react-native-harness';
import type { ViewModelInstance } from '@rive-app/react-native';
import { RiveFileFactory } from '@rive-app/react-native';

const DATABINDING = require('../assets/rive/databinding.riv');

async function createGordonInstance(): Promise<ViewModelInstance> {
  const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
  const vm = file.viewModelByName('Person');
  expect(vm).toBeDefined();
  const instance = vm!.createInstanceByName('Gordon');
  expect(instance).toBeDefined();
  return instance!;
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
    expect(ageProperty).toBeDefined();
    expect(ageProperty!.value).toBe(30);

    ageProperty!.value = 33;
    expect(ageProperty!.value).toBe(33);
  });

  it('stringProperty get/set works', async () => {
    const instance = await createGordonInstance();
    const nameProperty = instance.stringProperty('name');
    expect(nameProperty).toBeDefined();
    expect(nameProperty!.value).toBe('Gordon');

    nameProperty!.value = 'Peter';
    expect(nameProperty!.value).toBe('Peter');
  });

  it('booleanProperty get/set works', async () => {
    const instance = await createGordonInstance();
    const booleanProperty = instance.booleanProperty('likes_popcorn');
    expect(booleanProperty).toBeDefined();
    expect(booleanProperty!.value).toBe(false);

    booleanProperty!.value = true;
    expect(booleanProperty!.value).toBe(true);
  });

  it('colorProperty get/set works', async () => {
    const instance = await createGordonInstance();
    const colorProperty = instance.colorProperty('favourite_color');
    expect(colorProperty).toBeDefined();

    const initialRGB = getRGB(colorProperty!.value);
    expect(initialRGB).toEqual({ r: 255, g: 0, b: 0 });

    colorProperty!.value = 0xff00ff00;
    const newRGB = getRGB(colorProperty!.value);
    expect(newRGB).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('enumProperty get/set works', async () => {
    const instance = await createGordonInstance();
    const enumProperty = instance.enumProperty('favourite_pet');
    expect(enumProperty).toBeDefined();
    expect(enumProperty!.value).toBe('dog');

    enumProperty!.value = 'cat';
    expect(enumProperty!.value).toBe('cat');

    enumProperty!.value = 'snakeLizard';
    expect(enumProperty!.value).toBe('cat');
  });

  it('triggerProperty can be triggered', async () => {
    const instance = await createGordonInstance();
    const triggerProperty = instance.triggerProperty('jump');
    expect(triggerProperty).toBeDefined();

    expect(() => triggerProperty!.trigger()).not.toThrow();
  });

  it('nested viewModel property access works', async () => {
    const instance = await createGordonInstance();
    const petViewModel = instance.viewModel('pet');
    expect(petViewModel).toBeDefined();

    const petName = petViewModel!.stringProperty('name');
    expect(petName).toBeDefined();
    expect(petName!.value).toBe('Jameson');

    const petType = petViewModel!.enumProperty('type');
    expect(petType).toBeDefined();
    expect(petType!.value).toBe('frog');

    petType!.value = 'chipmunk';
    expect(petType!.value).toBe('chipmunk');
  });

  it('nested path property access works', async () => {
    const instance = await createGordonInstance();
    const nestedStringProperty = instance.stringProperty('pet/name');
    const nestedEnumProperty = instance.enumProperty('pet/type');

    expect(nestedStringProperty).toBeDefined();
    expect(nestedEnumProperty).toBeDefined();

    expect(nestedStringProperty!.value).toBe('Jameson');
    expect(nestedEnumProperty!.value).toBe('frog');

    nestedStringProperty!.value = 'Max';
    nestedEnumProperty!.value = 'owl';

    expect(nestedStringProperty!.value).toBe('Max');
    expect(nestedEnumProperty!.value).toBe('owl');
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
