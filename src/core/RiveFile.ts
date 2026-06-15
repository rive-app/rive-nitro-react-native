import { NitroModules } from 'react-native-nitro-modules';
import type { RiveFileFactory as RiveFileFactoryInternal } from '../specs/RiveFile.nitro';
import type { RiveAsset, RiveFileSchema, TypedRiveFile } from './TypedRiveFile';

import { Image } from 'react-native';
import type { ResolvedReferencedAssets } from './ReferencedAssets';

const RiveFileInternal =
  NitroModules.createHybridObject<RiveFileFactoryInternal>('RiveFileFactory');

/**
 * Factory namespace for creating RiveFile instances from different sources.
 * Provides static methods to load Rive files from URLs, resources, or raw bytes.
 */
export namespace RiveFileFactory {
  export async function fromURL<T extends RiveFileSchema = RiveFileSchema>(
    url: string,
    referencedAssets: ResolvedReferencedAssets | undefined,
    loadCdn: boolean = true
  ): Promise<TypedRiveFile<T>> {
    return RiveFileInternal.fromURL(
      url,
      loadCdn,
      referencedAssets ? { data: referencedAssets } : undefined
    ) as Promise<TypedRiveFile<T>>;
  }

  export async function fromFileURL<T extends RiveFileSchema = RiveFileSchema>(
    fileURL: string,
    referencedAssets: ResolvedReferencedAssets | undefined = undefined,
    loadCdn: boolean = true
  ): Promise<TypedRiveFile<T>> {
    return RiveFileInternal.fromFileURL(
      fileURL,
      loadCdn,
      referencedAssets ? { data: referencedAssets } : undefined
    ) as Promise<TypedRiveFile<T>>;
  }

  export async function fromResource<T extends RiveFileSchema = RiveFileSchema>(
    resource: string,
    referencedAssets: ResolvedReferencedAssets | undefined,
    loadCdn: boolean = true
  ): Promise<TypedRiveFile<T>> {
    return RiveFileInternal.fromResource(
      resource,
      loadCdn,
      referencedAssets ? { data: referencedAssets } : undefined
    ) as Promise<TypedRiveFile<T>>;
  }

  export async function fromBytes<T extends RiveFileSchema = RiveFileSchema>(
    bytes: ArrayBuffer,
    referencedAssets: ResolvedReferencedAssets | undefined,
    loadCdn: boolean = true
  ): Promise<TypedRiveFile<T>> {
    return RiveFileInternal.fromBytes(
      bytes,
      loadCdn,
      referencedAssets ? { data: referencedAssets } : undefined
    ) as Promise<TypedRiveFile<T>>;
  }

  /**
   * Creates a RiveFile instance from a source that can be either a resource ID or a URI object.
   * @param source - Either a number representing a resource ID or an object with a uri property
   * @param loadCdn - Whether to load from CDN (default: true)
   * @returns Promise that resolves to a RiveFile instance
   * @throws Error if the source is invalid or cannot be resolved
   * @example
   * // Using a resource ID
   * const riveFile1 = await RiveFileFactory.fromSource(require('./your_file.riv'));
   *
   * // Using a URI object
   * const riveFile2 = await RiveFileFactory.fromSource({ uri: 'https://example.com/your_file.riv' });
   *
   * // Using a local file URI
   * const riveFile3 = await RiveFileFactory.fromSource({ uri: 'file:///path/to/your_file.riv' });
   *
   * @note To use .riv files with require(), you need to add 'riv' to the asset extensions in your metro.config.js:
   * ```js
   * const config = getDefaultConfig(__dirname);
   * config.resolver.assetExts = [...config.resolver.assetExts, 'riv'];
   * ```
   */
  export async function fromSource<T extends RiveFileSchema>(
    source: RiveAsset<T>,
    referencedAssets: ResolvedReferencedAssets | undefined,
    loadCdn?: boolean
  ): Promise<TypedRiveFile<T>>;
  export async function fromSource(
    source: number | { uri: string },
    referencedAssets: ResolvedReferencedAssets | undefined,
    loadCdn?: boolean
  ): Promise<TypedRiveFile>;
  export async function fromSource<T extends RiveFileSchema = RiveFileSchema>(
    source: number | { uri: string },
    referencedAssets: ResolvedReferencedAssets | undefined,
    loadCdn: boolean = true
  ): Promise<TypedRiveFile<T>> {
    const assetID = typeof source === 'number' ? source : null;
    const sourceURI = typeof source === 'object' ? source.uri : null;

    const assetURI = assetID
      ? Image.resolveAssetSource(assetID)?.uri
      : sourceURI;

    if (!assetURI) {
      throw new Error(
        `Invalid source: could not resolve asset ${source}. Ensure 'riv' is in metro.config.js assetExts.`
      );
    }

    try {
      // handle http address and dev server
      if (assetURI.match(/https?:\/\//)) {
        return RiveFileFactory.fromURL<T>(assetURI, referencedAssets, loadCdn);
      }

      // handle iOS bundled asset
      if (assetURI.match(/file:\/\//)) {
        return RiveFileFactory.fromFileURL<T>(
          assetURI,
          referencedAssets,
          loadCdn
        );
      }

      // handle Android bundled asset or resource name uri
      return RiveFileFactory.fromResource<T>(
        assetURI,
        referencedAssets,
        loadCdn
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Rive file from source: ${errorMessage}`);
    }
  }
}
