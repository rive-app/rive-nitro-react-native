import type { HybridObject } from 'react-native-nitro-modules';

export interface RiveFontConfig
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /**
   * Enable system font fallback for missing glyphs (CJK, Arabic, Hebrew, etc.).
   * On iOS, this activates Core Text's automatic font matching.
   * On Android, this sets up a FontFallbackStrategy using system fonts.
   */
  enableSystemFontFallback(): Promise<void>;

  /**
   * Add a custom fallback font from raw bytes (TTF/OTF).
   * Custom fonts are tried before system fonts when resolving missing glyphs.
   */
  addFallbackFont(bytes: ArrayBuffer): Promise<void>;

  /**
   * Add a custom fallback font from a bundled resource.
   * @param resource - The resource name (e.g., "NotoSansCJK.ttf")
   */
  addFallbackFontFromResource(resource: string): Promise<void>;

  /**
   * Add a custom fallback font from a URL (http/https/file://).
   */
  addFallbackFontFromURL(url: string): Promise<void>;

  /**
   * Add a system font as a fallback by its font family name.
   * On iOS uses UIFont(name:), on Android uses FontHelper to resolve system fonts.
   */
  addFallbackFontByName(name: string): Promise<void>;

  /**
   * Apply pending font changes — updates the native fallback font list and resets caches.
   * Called once after adding fonts, rather than after each individual add.
   */
  applyFallbackFonts(): Promise<void>;

  /**
   * Clear all custom fallback fonts.
   * System font fallback remains active if previously enabled.
   */
  clearCustomFallbackFonts(): Promise<void>;
}
