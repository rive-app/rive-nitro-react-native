import { NitroModules } from 'react-native-nitro-modules';
import { Image } from 'react-native';
import type {
  RiveFontConfig,
  FallbackFont,
} from '../specs/RiveFontConfig.nitro';

const RiveFontConfigInternal =
  NitroModules.createHybridObject<RiveFontConfig>('RiveFontConfig');

/**
 * A font source that can be:
 * - `number` — a Metro `require('./Font.ttf')` asset ID
 * - `{ uri: string }` — a URI object (http/https URL, file:// path, or resource name)
 * - `string` — a native resource name (e.g. "kanit_regular.ttf") or URL
 * - `{ name: string }` — a system font name (e.g. "Arial", "sans-serif")
 * - `ArrayBuffer` — raw font bytes (TTF/OTF)
 */
export type FontSource =
  | number
  | { uri: string }
  | { name: string }
  | string
  | ArrayBuffer;

export type FallbackFontMap = Record<number, FallbackFont[]>;

export namespace RiveFonts {
  export async function loadFont(source: FontSource): Promise<FallbackFont> {
    if (source instanceof ArrayBuffer) {
      return RiveFontConfigInternal.loadFontFromBytes(source);
    }

    if (typeof source === 'number') {
      const resolved = Image.resolveAssetSource(source);
      if (!resolved?.uri) {
        throw new Error(
          `Invalid font asset: could not resolve require() ID ${source}. Ensure 'ttf' is in metro.config.js assetExts.`
        );
      }
      return loadFontByURI(resolved.uri);
    }

    if (typeof source === 'object' && 'name' in source) {
      return RiveFontConfigInternal.loadFontByName(source.name);
    }

    if (typeof source === 'object' && 'uri' in source) {
      return loadFontByURI(source.uri);
    }

    if (typeof source === 'string') {
      if (/^https?:\/\//.test(source) || /^file:\/\//.test(source)) {
        return RiveFontConfigInternal.loadFontFromURL(source);
      }
      return RiveFontConfigInternal.loadFontFromResource(source);
    }

    throw new Error(`Invalid font source: ${String(source)}`);
  }

  export async function setFallbackFonts(
    fontsByWeight: FallbackFontMap
  ): Promise<void> {
    for (const [weight, fonts] of Object.entries(fontsByWeight)) {
      RiveFontConfigInternal.setFontsForWeight(Number(weight), fonts);
    }
    await RiveFontConfigInternal.applyFallbackFonts();
  }

  export async function clearFallbackFonts(): Promise<void> {
    return RiveFontConfigInternal.clearFallbackFonts();
  }
}

function loadFontByURI(uri: string): Promise<FallbackFont> | FallbackFont {
  if (/^https?:\/\//.test(uri) || /^file:\/\//.test(uri)) {
    return RiveFontConfigInternal.loadFontFromURL(uri);
  }
  return RiveFontConfigInternal.loadFontFromResource(uri);
}
