import { describe, it, expect } from 'react-native-harness';
import { Platform } from 'react-native';
import {
  RiveFileFactory,
  RiveImages,
  type ViewModelInstance,
} from '@rive-app/react-native';

const DATABINDING = require('../assets/rive/databinding.riv');
const DATABINDING_IMAGES = require('../assets/rive/databinding_images.riv');
const ARTBOARD_DB_TEST = require('../assets/rive/artboard_db_test.riv');

// 1x1 red PNG
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

function pngBytes(): ArrayBuffer {
  const binary = atob(PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function createGordonInstance(): Promise<ViewModelInstance> {
  const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
  const vm = await file.viewModelByNameAsync('Person');
  const instance = await vm?.createInstanceByNameAsync('Gordon');
  expect(instance).toBeDefined();
  return instance!;
}

async function createArtboardInstance() {
  const file = await RiveFileFactory.fromSource(ARTBOARD_DB_TEST, undefined);
  const vm = await file.defaultArtboardViewModelAsync();
  const instance = await vm?.createDefaultInstanceAsync();
  const prop = instance?.artboardProperty('artboard_1');
  expect(prop).toBeDefined();
  return { file, prop: prop! };
}

describe('set() returns a promise', () => {
  it('applies number, string, boolean, color and enum writes', async () => {
    const instance = await createGordonInstance();

    const age = instance.numberProperty('age')!;
    await age.set(42);
    expect(await age.getValueAsync()).toBe(42);

    const name = instance.stringProperty('name')!;
    await name.set('Alice');
    expect(await name.getValueAsync()).toBe('Alice');

    const popcorn = instance.booleanProperty('likes_popcorn')!;
    await popcorn.set(true);
    expect(await popcorn.getValueAsync()).toBe(true);

    const color = instance.colorProperty('favourite_color')!;
    await color.set(0xff00ff00);
    // eslint-disable-next-line no-bitwise
    expect((await color.getValueAsync()) & 0xffffff).toBe(0x00ff00);

    const pet = instance.enumProperty('favourite_pet')!;
    await pet.set('cat');
    expect(await pet.getValueAsync()).toBe('cat');
  });

  it('applies unawaited writes in call order', async () => {
    const instance = await createGordonInstance();
    const age = instance.numberProperty('age')!;

    const writes = Array.from({ length: 50 }, (_, i) => age.set(i));
    await Promise.all(writes);

    expect(await age.getValueAsync()).toBe(49);
  });

  it('keeps setValueAsync as an alias', async () => {
    const instance = await createGordonInstance();
    const age = instance.numberProperty('age')!;

    await age.setValueAsync(7);

    expect(await age.getValueAsync()).toBe(7);
  });

  it('resolves an artboard write', async () => {
    const { file, prop } = await createArtboardInstance();
    const names = await file.getArtboardNamesAsync();

    await expect(
      prop.set(file.getBindableArtboard(names[0]!))
    ).resolves.toBeUndefined();
  });

  it('rejects an artboard write that cannot be applied', async () => {
    // Android creates the artboard handle without confirming the name exists.
    if (Platform.OS !== 'ios') return;
    const { file, prop } = await createArtboardInstance();

    await expect(
      prop.set(file.getBindableArtboard('no such artboard'))
    ).rejects.toBeDefined();
  });

  it('resolves an image write and rejects one that fails to decode', async () => {
    const file = await RiveFileFactory.fromSource(
      DATABINDING_IMAGES,
      undefined
    );
    const vm = await file.viewModelByNameAsync('MyViewModel');
    const instance = await vm?.createDefaultInstanceAsync();
    const prop = instance!.imageProperty('bound_image')!;

    const image = await RiveImages.loadFromBytesAsync(pngBytes());
    await expect(prop.set(image)).resolves.toBeUndefined();

    // iOS decodes in RiveImages, so corrupt bytes never reach the property.
    if (Platform.OS !== 'android') return;
    const corrupt = await RiveImages.loadFromBytesAsync(
      new Uint8Array([1, 2, 3, 4]).buffer
    );
    await expect(prop.set(corrupt)).rejects.toBeDefined();
  });
});
