import { describe, it, expect } from 'react-native-harness';
import { RiveFileFactory } from '@rive-app/react-native';

const OUT_OF_BAND = require('../assets/rive/out_of_band.riv');

function isExperimental() {
  return RiveFileFactory.getBackend() === 'experimental';
}

describe('Asset loading with referencedAssets', () => {
  // referencedAssets with raw ResolvedReferencedAsset objects only works
  // on the new runtime; legacy uses a different resolution path.
  it('loads file with font asset (type: font)', async () => {
    if (!isExperimental()) return;
    const file = await RiveFileFactory.fromSource(OUT_OF_BAND, {
      'Inter-594377': {
        sourceAssetId: 'Inter-594377.ttf',
        type: 'font',
      },
    });
    expect(file).toBeDefined();
    expect(file.artboardNames.length).toBeGreaterThan(0);
  });

  it('loads file with image asset via URL (type: image)', async () => {
    if (!isExperimental()) return;
    const file = await RiveFileFactory.fromSource(OUT_OF_BAND, {
      'referenced-image-2929282': {
        sourceUrl: 'https://picsum.photos/id/237/200/200',
        type: 'image',
      },
    });
    expect(file).toBeDefined();
    expect(file.artboardNames.length).toBeGreaterThan(0);
  });

  it('loads file with multiple asset types', async () => {
    if (!isExperimental()) return;
    const file = await RiveFileFactory.fromSource(OUT_OF_BAND, {
      'Inter-594377': {
        sourceAssetId: 'Inter-594377.ttf',
        type: 'font',
      },
      'referenced-image-2929282': {
        sourceUrl: 'https://picsum.photos/id/237/200/200',
        type: 'image',
      },
    });
    expect(file).toBeDefined();
  });

  it('loads file without referencedAssets (undefined)', async () => {
    const file = await RiveFileFactory.fromSource(OUT_OF_BAND, undefined);
    expect(file).toBeDefined();
    expect(file.artboardNames.length).toBeGreaterThan(0);
  });
});
