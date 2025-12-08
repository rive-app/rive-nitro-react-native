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

  /**
   * Load an image from a bundled resource
   * @param resource The resource name (e.g., "image.png")
   * @returns A promise that resolves to the loaded RiveImage
   */
  loadFromResourceAsync(resource: string): Promise<RiveImage>;

  /**
   * Load an image from raw bytes
   * @param bytes The image data as an ArrayBuffer
   * @returns A promise that resolves to the loaded RiveImage
   */
  loadFromBytesAsync(bytes: ArrayBuffer): Promise<RiveImage>;
}
