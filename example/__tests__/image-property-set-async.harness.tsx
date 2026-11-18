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

/* eslint-disable no-bitwise */
// A blank grayscale PNG whose pixel data is a single deflate block of back-references, so it
// stays a few KB at any size while still taking the decoder real time to inflate.
function blankPngBytes(size: number): ArrayBuffer {
  const u32 = (v: number) => [
    v >>> 24,
    (v >>> 16) & 0xff,
    (v >>> 8) & 0xff,
    v & 0xff,
  ];
  const out: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;
  const writeBits = (value: number, count: number) => {
    for (let i = 0; i < count; i++) {
      bitBuffer |= ((value >> i) & 1) << bitCount++;
      if (bitCount === 8) {
        out.push(bitBuffer);
        bitBuffer = 0;
        bitCount = 0;
      }
    }
  };
  const writeCode = (code: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) writeBits((code >> i) & 1, 1);
  };

  const rawLength = size * (size + 1);
  out.push(0x78, 0x01);
  writeBits(1, 1);
  writeBits(1, 2);
  writeCode(0x30, 8);
  let remaining = rawLength - 1;
  for (; remaining >= 258; remaining -= 258) {
    writeCode(0xc5, 8);
    writeCode(0, 5);
  }
  for (; remaining > 0; remaining--) writeCode(0x30, 8);
  writeCode(0, 7);
  if (bitCount > 0) writeBits(0, 8 - bitCount);
  out.push(...u32((rawLength % 65521) * 65536 + 1));

  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const chunk = (type: string, data: number[]) => {
    const body = [...type].map((c) => c.charCodeAt(0)).concat(data);
    let crc = 0xffffffff;
    for (const b of body) crc = crcTable[(crc ^ b) & 0xff]! ^ (crc >>> 8);
    return u32(data.length).concat(body, u32((crc ^ 0xffffffff) >>> 0));
  };

  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].concat(
    chunk('IHDR', [...u32(size), ...u32(size), 8, 0, 0, 0, 0]),
    chunk('IDAT', out),
    chunk('IEND', [])
  );
  return new Uint8Array(png).buffer;
}
/* eslint-enable no-bitwise */

// Only the new Android backend defers decoding to the property, so elsewhere
// RiveImages rejects these bytes before they can reach setValueAsync.
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

describe('ViewModelImageProperty.setValueAsync', () => {
  it('resolves once the image is applied', async () => {
    const { file, instance, prop } = await loadImageInstance();
    const image = await RiveImages.loadFromBytesAsync(pngBytes());

    await expect(prop.setValueAsync(image)).resolves.toBeUndefined();

    prop.dispose();
    instance.dispose();
    file.dispose();
  });

  it('resolves a call superseded by a newer setValueAsync', async () => {
    const { file, instance, prop } = await loadImageInstance();
    const image = await RiveImages.loadFromBytesAsync(pngBytes());

    const older = prop.setValueAsync(image);
    const newer = prop.setValueAsync(image);

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

    const older = prop.setValueAsync(image);
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

    const older = prop.setValueAsync(image);
    const clear = prop.setValueAsync(undefined);

    await expect(older).resolves.toBeUndefined();
    await expect(clear).resolves.toBeUndefined();

    prop.dispose();
    instance.dispose();
    file.dispose();
  });

  it('clears with undefined', async () => {
    const { file, instance, prop } = await loadImageInstance();
    const image = await RiveImages.loadFromBytesAsync(pngBytes());

    await prop.setValueAsync(image);
    await expect(prop.setValueAsync(undefined)).resolves.toBeUndefined();

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

    await expect(prop.setValueAsync(corrupt)).rejects.toBeDefined();

    // A failed decode must not stop later sets from being processed.
    const image = await RiveImages.loadFromBytesAsync(pngBytes());
    await expect(prop.setValueAsync(image)).resolves.toBeUndefined();

    prop.dispose();
    instance.dispose();
    file.dispose();
  });

  it('applies a newer call after a failing one', async () => {
    if (!decodesInProperty) return;
    const { file, instance, prop } = await loadImageInstance();
    const corrupt = await RiveImages.loadFromBytesAsync(
      new Uint8Array([1, 2, 3, 4]).buffer
    );
    const image = await RiveImages.loadFromBytesAsync(pngBytes());

    const older = prop.setValueAsync(corrupt);
    const newer = prop.setValueAsync(image);

    await expect(older).rejects.toBeDefined();
    await expect(newer).resolves.toBeUndefined();

    prop.dispose();
    instance.dispose();
    file.dispose();
  });

  it('applies calls through different wrappers of a path in call order', async () => {
    const { file, instance, prop } = await loadImageInstance();
    const samePath = instance.imageProperty('bound_image')!;
    const image = await RiveImages.loadFromBytesAsync(pngBytes());
    const order: string[] = [];

    await Promise.all([
      prop.setValueAsync(image).then(() => order.push('set')),
      samePath.setValueAsync(undefined).then(() => order.push('clear')),
    ]);

    expect(order).toEqual(['set', 'clear']);

    samePath.dispose();
    prop.dispose();
    instance.dispose();
    file.dispose();
  });

  it('resolves queued calls when the instance is disposed before they apply', async () => {
    const { file, instance, prop } = await loadImageInstance();
    const large = await RiveImages.loadFromBytesAsync(blankPngBytes(2048));
    const image = await RiveImages.loadFromBytesAsync(pngBytes());

    const held = prop.setValueAsync(large);
    const queued = prop.setValueAsync(image);
    instance.dispose();

    await expect(held).resolves.toBeUndefined();
    await expect(queued).resolves.toBeUndefined();

    prop.dispose();
    file.dispose();
  });
});
