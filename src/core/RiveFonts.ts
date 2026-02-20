import { NitroModules } from 'react-native-nitro-modules';
import { Image } from 'react-native';
import type { RiveFontConfig } from '../specs/RiveFontConfig.nitro';

const RiveFontConfigInternal =
  NitroModules.createHybridObject<RiveFontConfig>('RiveFontConfig');

/**
 * A font source that can be:
 * - `number` — a Metro `require('./Font.ttf')` asset ID
 * - `{ uri: string }` — a URI object (http/https URL, file:// path, or resource name)
 * - `string` — a native resource name (e.g. "kanit_regular.ttf") or URL
 * - `ArrayBuffer` — raw font bytes (TTF/OTF)
 */
export type FontSource = number | { uri: string } | string | ArrayBuffer;

export namespace RiveFonts {
  export async function enableSystemFontFallback(): Promise<void> {
    return RiveFontConfigInternal.enableSystemFontFallback();
  }

  export async function addFallbackFont(source: FontSource): Promise<void> {
    if (source instanceof ArrayBuffer) {
      return RiveFontConfigInternal.addFallbackFont(source);
    }

    if (typeof source === 'number') {
      const resolved = Image.resolveAssetSource(source);
      if (!resolved?.uri) {
        throw new Error(
          `Invalid font asset: could not resolve require() ID ${source}. Ensure 'ttf' is in metro.config.js assetExts.`
        );
      }
      return dispatchByURI(resolved.uri);
    }

    if (typeof source === 'object' && 'uri' in source) {
      return dispatchByURI(source.uri);
    }

    if (typeof source === 'string') {
      if (/^https?:\/\//.test(source) || /^file:\/\//.test(source)) {
        return RiveFontConfigInternal.addFallbackFontFromURL(source);
      }
      return RiveFontConfigInternal.addFallbackFontFromResource(source);
    }

    throw new Error(`Invalid font source: ${String(source)}`);
  }

  export async function clearCustomFallbackFonts(): Promise<void> {
    return RiveFontConfigInternal.clearCustomFallbackFonts();
  }
}

function dispatchByURI(uri: string): Promise<void> {
  if (/^https?:\/\//.test(uri) || /^file:\/\//.test(uri)) {
    return RiveFontConfigInternal.addFallbackFontFromURL(uri);
  }
  return RiveFontConfigInternal.addFallbackFontFromResource(uri);
}
