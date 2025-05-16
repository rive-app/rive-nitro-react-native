import type { HybridObject } from 'react-native-nitro-modules';

export interface RiveFile
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  readonly name: string;
  release(): void;
}

export interface RiveFileFactory
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  fromURL(url: string, loadCdn: boolean): Promise<RiveFile>;
  fromResource(resource: string, loadCdn: boolean): Promise<RiveFile>;
  fromBytes(bytes: ArrayBuffer, loadCdn: boolean): Promise<RiveFile>;
}
