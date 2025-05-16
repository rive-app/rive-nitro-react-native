import { NitroModules } from 'react-native-nitro-modules';
import type {
  RiveFile,
  RiveFileFactory as RiveFileFactoryInternal,
} from '../specs/RiveFile.nitro';

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
}
