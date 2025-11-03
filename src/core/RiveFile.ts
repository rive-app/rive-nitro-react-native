import { NitroModules } from 'react-native-nitro-modules';
import type {
  RiveFile,
  RiveFileFactory as RiveFileFactoryInternal,
} from '../specs/RiveFile.nitro';

// This import path isn't handled by @types/react-native
// @ts-ignore
import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';

const RiveFileInternal =
  NitroModules.createHybridObject<RiveFileFactoryInternal>('RiveFileFactory');

/**
 * Factory namespace for creating RiveFile instances from different sources.
 * Provides static methods to load Rive animations from URLs, resources, or raw bytes.
 */
export namespace RiveFileFactory {
  /**
   * Creates a RiveFile instance from a URL.
   * @param url - The URL of the Rive animation file
   * @param loadCdn - Whether to load from CDN (default: true)
   * @returns Promise that resolves to a RiveFile instance
   */
  export async function fromURL(
    url: string,
    loadCdn: boolean = true
  ): Promise<RiveFile> {
    return RiveFileInternal.fromURL(url, loadCdn);
  }

  /**
   * Creates a RiveFile instance from a local file path URL.
   * @param pathURL - The local file path of the Rive graphic file
   * @param loadCdn - Whether to load from CDN (default: true)
   * @returns Promise that resolves to a RiveFile instance
   */
  export async function fromFileURL(
    fileURL: string,
    loadCdn: boolean = true
  ): Promise<RiveFile> {
    return RiveFileInternal.fromFileURL(fileURL, loadCdn);
  }

  /**
   * Creates a RiveFile instance from a local resource.
   * @param resource - The name of the local resource
   * @param loadCdn - Whether to load from CDN (default: true)
   * @returns Promise that resolves to a RiveFile instance
   */
  export async function fromResource(
    resource: string,
    loadCdn: boolean = true
  ): Promise<RiveFile> {
    return RiveFileInternal.fromResource(resource, loadCdn);
  }

  /**
   * Creates a RiveFile instance from raw bytes.
   * @param bytes - The raw bytes of the Rive animation file
   * @param loadCdn - Whether to load from CDN (default: true)
   * @returns Promise that resolves to a RiveFile instance
   */
  export async function fromBytes(
    bytes: ArrayBuffer,
    loadCdn: boolean = true
  ): Promise<RiveFile> {
    return RiveFileInternal.fromBytes(bytes, loadCdn);
  }

  /**
   * Creates a RiveFile instance from a source that can be either a resource ID or a URI object.
   * @param source - Either a number representing a resource ID or an object with a uri property
   * @param loadCdn - Whether to load from CDN (default: true)
   * @returns Promise that resolves to a RiveFile instance
   * @throws Error if the source is invalid or cannot be resolved
   * @example
   * // Using a resource ID
   * const riveFile1 = await RiveFileFactory.fromSource(require('./animation.riv'));
   *
   * // Using a URI object
   * const riveFile2 = await RiveFileFactory.fromSource({ uri: 'https://example.com/animation.riv' });
   *
   * // Using a local file URI
   * const riveFile3 = await RiveFileFactory.fromSource({ uri: 'file:///path/to/animation.riv' });
   *
   * @note To use .riv files with require(), you need to add 'riv' to the asset extensions in your metro.config.js:
   * ```js
   * const config = getDefaultConfig(__dirname);
   * config.resolver.assetExts = [...config.resolver.assetExts, 'riv'];
   * ```
   */
  export async function fromSource(
    source: number | { uri: string },
    loadCdn: boolean = true
  ): Promise<RiveFile> {
    const assetID = typeof source === 'number' ? source : null;
    const sourceURI = typeof source === 'object' ? source.uri : null;

    const assetURI = assetID ? resolveAssetSource(assetID)?.uri : sourceURI;

    if (!assetURI) {
      throw new Error(
        `Invalid source provided, ${source} is not a valid asset ID or URI`
      );
    }

    try {
      // handle http address and dev server
      if (assetURI.match(/https?:\/\//)) {
        return RiveFileFactory.fromURL(assetURI, loadCdn);
      }

      // handle iOS bundled asset
      if (assetURI.match(/file:\/\//)) {
        return RiveFileFactory.fromFileURL(assetURI, loadCdn);
      }

      // handle Android bundled asset or resource name uri
      return RiveFileFactory.fromResource(assetURI, loadCdn);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Rive file from source: ${errorMessage}`);
    }
  }
}
