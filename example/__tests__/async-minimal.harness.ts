import { describe, it, expect } from 'react-native-harness';
import { RiveFileFactory } from '@rive-app/react-native';

const DATABINDING = require('../assets/rive/databinding.riv');

describe('Property getValueAsync all 5', () => {
  it('number', async () => {
    console.log('[TEST] start number');
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const instance = file
      .viewModelByName('Person')!
      .createInstanceByName('Gordon')!;
    const value = await instance.numberProperty('age')!.getValueAsync();
    console.log('[TEST] done number:', value);
    expect(value).toBe(30);
  });

  it('string', async () => {
    console.log('[TEST] start string');
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const instance = file
      .viewModelByName('Person')!
      .createInstanceByName('Gordon')!;
    const value = await instance.stringProperty('name')!.getValueAsync();
    console.log('[TEST] done string:', value);
    expect(value).toBe('Gordon');
  });

  it('boolean', async () => {
    console.log('[TEST] start boolean');
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const instance = file
      .viewModelByName('Person')!
      .createInstanceByName('Gordon')!;
    const value = await instance
      .booleanProperty('likes_popcorn')!
      .getValueAsync();
    console.log('[TEST] done boolean:', value);
    expect(value).toBe(false);
  });

  it('color', async () => {
    console.log('[TEST] start color');
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const instance = file
      .viewModelByName('Person')!
      .createInstanceByName('Gordon')!;
    const value = await instance
      .colorProperty('favourite_color')!
      .getValueAsync();
    console.log('[TEST] done color:', value);
    expect(typeof value).toBe('number');
  });

  it('enum', async () => {
    console.log('[TEST] start enum');
    const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
    const instance = file
      .viewModelByName('Person')!
      .createInstanceByName('Gordon')!;
    const value = await instance.enumProperty('favourite_pet')!.getValueAsync();
    console.log('[TEST] done enum:', value);
    expect(value).toBe('dog');
  });
});
