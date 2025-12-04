import type { HybridObject } from 'react-native-nitro-modules';

/**
 * A Rive-compatible image that can be used for:
 * - Referenced assets (out-of-band asset loading)
 * - Image data binding (future: ViewModelImageProperty)
 *
 * The image stores the raw encoded bytes and is decoded when assigned to an asset.
 */
export interface RiveImage
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /** The size of the image data in bytes */
  readonly byteSize: number;
}

/**
 * Factory for creating RiveImage instances from various sources.
 * Exposed as `RiveImages` in the public API.
 */
export interface RiveImageFactory
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /**
   * Load an image from a URL (http/https/file://)
   * @param url The URL to load the image from
   * @returns A promise that resolves to the loaded RiveImage
   */
  loadFromURLAsync(url: string): Promise<RiveImage>;
}
