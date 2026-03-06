import type { HybridObject } from 'react-native-nitro-modules';

export interface FallbackFont
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {}

export interface RiveFontConfig
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  loadFontFromURL(url: string): Promise<FallbackFont>;
  loadFontFromResource(resource: string): FallbackFont;
  loadFontFromBytes(bytes: ArrayBuffer): FallbackFont;
  loadFontByName(name: string): FallbackFont;
  getSystemDefaultFont(): FallbackFont;
  setFontsForWeight(weight: number, fonts: FallbackFont[]): void;
  applyFallbackFonts(): Promise<void>;
  clearFallbackFonts(): Promise<void>;
}
