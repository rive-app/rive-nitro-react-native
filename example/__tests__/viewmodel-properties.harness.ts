import { describe, it, expect } from 'react-native-harness';
import { RiveFileFactory } from '@rive-app/react-native';

const DATABINDING = require('../assets/rive/databinding.riv');

describe('ViewModel Properties', () => {
  it('numberProperty get/set works', async () => {
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const vm = file.viewModelByName('Person');
    expect(vm).toBeDefined();

    const instance = vm!.createInstanceByName('Gordon');
    expect(instance).toBeDefined();

    const ageProperty = instance!.numberProperty('age');
    expect(ageProperty).toBeDefined();
    expect(ageProperty!.value).toBe(30);

    ageProperty!.value = 33;
    expect(ageProperty!.value).toBe(33);
  });

  it('stringProperty get/set works', async () => {
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const vm = file.viewModelByName('Person');
    expect(vm).toBeDefined();

    const instance = vm!.createInstanceByName('Gordon');
    expect(instance).toBeDefined();

    const nameProperty = instance!.stringProperty('name');
    expect(nameProperty).toBeDefined();
    expect(nameProperty!.value).toBe('Gordon');

    nameProperty!.value = 'Peter';
    expect(nameProperty!.value).toBe('Peter');
  });

  it('booleanProperty get/set works', async () => {
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const vm = file.viewModelByName('Person');
    expect(vm).toBeDefined();

    const instance = vm!.createInstanceByName('Gordon');
    expect(instance).toBeDefined();

    const booleanProperty = instance!.booleanProperty('likes_popcorn');
    expect(booleanProperty).toBeDefined();
    expect(booleanProperty!.value).toBe(false);

    booleanProperty!.value = true;
    expect(booleanProperty!.value).toBe(true);
  });

  it('colorProperty get/set works', async () => {
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const vm = file.viewModelByName('Person');
    expect(vm).toBeDefined();

    const instance = vm!.createInstanceByName('Gordon');
    expect(instance).toBeDefined();

    const colorProperty = instance!.colorProperty('favourite_color');
    expect(colorProperty).toBeDefined();

    // Initial value is red (0xFFFF0000)
    const initialColor = colorProperty!.value;
    // eslint-disable-next-line no-bitwise
    expect((initialColor >> 16) & 0xff).toBe(255); // Red channel
    // eslint-disable-next-line no-bitwise
    expect((initialColor >> 8) & 0xff).toBe(0); // Green channel
    // eslint-disable-next-line no-bitwise
    expect(initialColor & 0xff).toBe(0); // Blue channel

    // Set to green (0xFF00FF00)
    const greenColor = 0xff00ff00;
    colorProperty!.value = greenColor;
    const newColor = colorProperty!.value;
    // eslint-disable-next-line no-bitwise
    expect((newColor >> 16) & 0xff).toBe(0); // Red channel
    // eslint-disable-next-line no-bitwise
    expect((newColor >> 8) & 0xff).toBe(255); // Green channel
    // eslint-disable-next-line no-bitwise
    expect(newColor & 0xff).toBe(0); // Blue channel
  });

  it('enumProperty get/set works', async () => {
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const vm = file.viewModelByName('Person');
    expect(vm).toBeDefined();

    const instance = vm!.createInstanceByName('Gordon');
    expect(instance).toBeDefined();

    const enumProperty = instance!.enumProperty('favourite_pet');
    expect(enumProperty).toBeDefined();
    expect(enumProperty!.value).toBe('dog');

    enumProperty!.value = 'cat';
    expect(enumProperty!.value).toBe('cat');

    // Invalid enum value should not change the property
    enumProperty!.value = 'snakeLizard';
    expect(enumProperty!.value).toBe('cat');
  });

  it('triggerProperty can be triggered', async () => {
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const vm = file.viewModelByName('Person');
    expect(vm).toBeDefined();

    const instance = vm!.createInstanceByName('Gordon');
    expect(instance).toBeDefined();

    const triggerProperty = instance!.triggerProperty('jump');
    expect(triggerProperty).toBeDefined();

    // Trigger should not throw
    expect(() => triggerProperty!.trigger()).not.toThrow();
  });

  it('nested viewModel property access works', async () => {
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const vm = file.viewModelByName('Person');
    expect(vm).toBeDefined();

    const instance = vm!.createInstanceByName('Gordon');
    expect(instance).toBeDefined();

    // Access nested viewModel
    const petViewModel = instance!.viewModel('pet');
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
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const vm = file.viewModelByName('Person');
    expect(vm).toBeDefined();

    const instance = vm!.createInstanceByName('Gordon');
    expect(instance).toBeDefined();

    // Access property via nested path
    const nestedStringProperty = instance!.stringProperty('pet/name');
    const nestedEnumProperty = instance!.enumProperty('pet/type');

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
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const vm = file.viewModelByName('Person');
    expect(vm).toBeDefined();

    const instance = vm!.createInstanceByName('Gordon');
    expect(instance).toBeDefined();

    expect(instance!.numberProperty('nonexistent')).toBeUndefined();
    expect(instance!.stringProperty('nonexistent')).toBeUndefined();
    expect(instance!.booleanProperty('nonexistent')).toBeUndefined();
    expect(instance!.colorProperty('nonexistent')).toBeUndefined();
    expect(instance!.enumProperty('nonexistent')).toBeUndefined();
    expect(instance!.triggerProperty('nonexistent')).toBeUndefined();
    expect(instance!.viewModel('nonexistent')).toBeUndefined();
  });
});
