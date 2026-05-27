import { describe, it, expect } from 'react-native-harness';
import { RiveFonts } from '@rive-app/react-native';

describe('RiveFonts', () => {
  it('systemFallback() returns a font object', () => {
    const font = RiveFonts.systemFallback();
    expect(font).toBeDefined();
  });

  it('loadFont with system font name', async () => {
    const font = await RiveFonts.loadFont({ name: 'Helvetica' });
    expect(font).toBeDefined();
  });

  it('loadFont with URL', async () => {
    const font = await RiveFonts.loadFont({
      uri: 'https://raw.githubusercontent.com/google/fonts/main/ofl/kanit/Kanit-Regular.ttf',
    });
    expect(font).toBeDefined();
  });

  it('setFallbackFonts + clearFallbackFonts round-trip', async () => {
    const systemFont = RiveFonts.systemFallback();
    const namedFont = await RiveFonts.loadFont({ name: 'Helvetica' });

    await RiveFonts.setFallbackFonts({
      default: [namedFont, systemFont],
    });

    await RiveFonts.clearFallbackFonts();
  });

  it('setFallbackFonts with weight-specific fonts', async () => {
    const regular = await RiveFonts.loadFont({ name: 'Helvetica' });
    const bold = await RiveFonts.loadFont({ name: 'Helvetica-Bold' });
    const systemFont = RiveFonts.systemFallback();

    await RiveFonts.setFallbackFonts({
      default: [regular, systemFont],
      700: [bold, systemFont],
    });

    await RiveFonts.clearFallbackFonts();
  });

  it('loadFont with invalid name throws', async () => {
    await expect(
      RiveFonts.loadFont({ name: 'NonExistentFont_XYZ_12345' })
    ).rejects.toBeDefined();
  });
});
