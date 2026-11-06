import { describe, it, expect } from 'react-native-harness';
import { Platform } from 'react-native';
import { RiveFileFactory, RiveImages } from '@rive-app/react-native';

const DATABINDING_IMAGES = require('../assets/rive/databinding_images.riv');

// 1x1 red PNG
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

function pngBytes(): ArrayBuffer {
  const binary = atob(PNG_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Only the new Android backend defers decoding to the property, so elsewhere
// RiveImages rejects these bytes before they can reach setAsync.
const decodesInProperty =
  Platform.OS === 'android' && RiveFileFactory.getBackend() === 'experimental';

async function loadImageInstance() {
  const file = await RiveFileFactory.fromSource(DATABINDING_IMAGES, undefined);
  const instance = file
    .viewModelByName('MyViewModel')
    ?.createInstanceByIndex(0);
  const prop = instance?.imageProperty('bound_image');
  expect(prop).toBeDefined();
  return { file, instance: instance!, prop: prop! };
}

describe('ViewModelImageProperty.setAsync', () => {
  it('resolves once the image is applied', async () => {
    const { file, instance, prop } = await loadImageInstance();
    const image = await RiveImages.loadFromBytesAsync(pngBytes());

    await expect(prop.setAsync(image)).resolves.toBeUndefined();

    prop.dispose();
    instance.dispose();
    file.dispose();
  });

  it('resolves a call superseded by a newer setAsync', async () => {
    const { file, instance, prop } = await loadImageInstance();
    const image = await RiveImages.loadFromBytesAsync(pngBytes());

    const older = prop.setAsync(image);
    const newer = prop.setAsync(image);

    await expect(older).resolves.toBeUndefined();
    await expect(newer).resolves.toBeUndefined();

    prop.dispose();
    instance.dispose();
    file.dispose();
  });

  it('resolves a call superseded through another wrapper of the path', async () => {
    const { file, instance, prop } = await loadImageInstance();
    const image = await RiveImages.loadFromBytesAsync(pngBytes());
    const samePath = instance.imageProperty('bound_image')!;

    const older = prop.setAsync(image);
    samePath.set(image);

    await expect(older).resolves.toBeUndefined();

    samePath.dispose();
    prop.dispose();
    instance.dispose();
    file.dispose();
  });

  it('resolves a call superseded by a clear', async () => {
    const { file, instance, prop } = await loadImageInstance();
    const image = await RiveImages.loadFromBytesAsync(pngBytes());

    const older = prop.setAsync(image);
    const clear = prop.setAsync(undefined);

    await expect(older).resolves.toBeUndefined();
    await expect(clear).resolves.toBeUndefined();

    prop.dispose();
    instance.dispose();
    file.dispose();
  });

  it('clears with undefined', async () => {
    const { file, instance, prop } = await loadImageInstance();
    const image = await RiveImages.loadFromBytesAsync(pngBytes());

    await prop.setAsync(image);
    await expect(prop.setAsync(undefined)).resolves.toBeUndefined();

    prop.dispose();
    instance.dispose();
    file.dispose();
  });

  it('rejects when decoding fails', async () => {
    if (!decodesInProperty) return;
    const { file, instance, prop } = await loadImageInstance();
    const corrupt = await RiveImages.loadFromBytesAsync(
      new Uint8Array([1, 2, 3, 4]).buffer
    );

    await expect(prop.setAsync(corrupt)).rejects.toBeDefined();

    // A failed decode must not stop later sets from being processed.
    const image = await RiveImages.loadFromBytesAsync(pngBytes());
    await expect(prop.setAsync(image)).resolves.toBeUndefined();

    prop.dispose();
    instance.dispose();
    file.dispose();
  });

  it('resolves a failing call superseded by a newer one', async () => {
    if (!decodesInProperty) return;
    const { file, instance, prop } = await loadImageInstance();
    const corrupt = await RiveImages.loadFromBytesAsync(
      new Uint8Array([1, 2, 3, 4]).buffer
    );
    const image = await RiveImages.loadFromBytesAsync(pngBytes());

    const older = prop.setAsync(corrupt);
    const newer = prop.setAsync(image);

    await expect(older).resolves.toBeUndefined();
    await expect(newer).resolves.toBeUndefined();

    prop.dispose();
    instance.dispose();
    file.dispose();
  });
});
