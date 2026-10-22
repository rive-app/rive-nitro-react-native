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

describe('ViewModelImageProperty', () => {
  it('set(undefined) after set(image) clears without throwing', async () => {
    const file = await RiveFileFactory.fromSource(
      DATABINDING_IMAGES,
      undefined
    );
    const instance = file
      .viewModelByName('MyViewModel')
      ?.createInstanceByIndex(0);
    const prop = instance?.imageProperty('bound_image');
    expect(prop).toBeDefined();

    // The new iOS runtime can't clear image properties yet (#360)
    const canClear =
      Platform.OS !== 'ios' || RiveFileFactory.getBackend() !== 'experimental';

    const image = await RiveImages.loadFromBytesAsync(pngBytes());
    for (let i = 0; i < 10; i++) prop!.set(image);
    if (canClear) prop!.set(undefined);
    prop!.set(image);
    if (canClear) prop!.set(undefined);

    prop!.dispose();
    instance!.dispose();
    file.dispose();
  });
});
