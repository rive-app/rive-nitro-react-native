import { describe, it, expect } from 'react-native-harness';
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

async function loadImageProperty() {
  const file = await RiveFileFactory.fromSource(DATABINDING_IMAGES, undefined);
  const instance = file
    .viewModelByName('MyViewModel')
    ?.createInstanceByIndex(0);
  const prop = instance?.imageProperty('bound_image');
  expect(prop).toBeDefined();
  return { file, instance: instance!, prop: prop! };
}

describe('RiveImage disposal', () => {
  it('disposing a bound image leaves the property usable', async () => {
    const { file, instance, prop } = await loadImageProperty();
    const first = await RiveImages.loadFromBytesAsync(pngBytes());
    prop.set(first);
    first.dispose();

    const second = await RiveImages.loadFromBytesAsync(pngBytes());
    prop.set(second);
    second.dispose();
    prop.set(undefined);

    prop.dispose();
    instance.dispose();
    file.dispose();
  });

  it('swapping many images with dispose does not throw', async () => {
    const { file, instance, prop } = await loadImageProperty();
    for (let i = 0; i < 20; i++) {
      const image = await RiveImages.loadFromBytesAsync(pngBytes());
      prop.set(image);
      image.dispose();
    }
    prop.dispose();
    instance.dispose();
    file.dispose();
  });
});
