import type { HybridObject } from 'react-native-nitro-modules';
import type { ViewModel } from './ViewModel.nitro';
import type { ArtboardBy } from './ArtboardBy';
import type { RiveImage } from './RiveImage.nitro';
import type { BindableArtboard } from './BindableArtboard.nitro';

export type ResolvedReferencedAsset = {
  sourceUrl?: string;
  sourceAsset?: string;
  /** URL on iOS, URL or resource name on Android (from Image.resolveAssetSource) */
  sourceAssetId?: string;
  path?: string;
  image?: RiveImage;
};

export type ReferencedAssetsType = {
  data?: Record<string, ResolvedReferencedAsset>;
};

/**
 * A Rive file (.riv) as created in the Rive editor.
 */
export interface RiveFile
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /** The number of view models in the Rive file */
  readonly viewModelCount?: number;
  /** Get a view model by index */
  viewModelByIndex(index: number): ViewModel | undefined;
  /** Get a view model by name */
  viewModelByName(name: string): ViewModel | undefined;
  /** Returns the default view model for the provided artboard */
  defaultArtboardViewModel(artboardBy?: ArtboardBy): ViewModel | undefined;
  updateReferencedAssets(referencedAssets: ReferencedAssetsType): void;

  /** The number of artboards in the Rive file */
  readonly artboardCount: number;
  /** The names of all artboards in the Rive file */
  readonly artboardNames: string[];
  /**
   * Get a bindable artboard by name for use with data binding.
   * @throws Error if artboard with the given name is not found
   * @see {@link https://rive.app/docs/runtimes/data-binding Rive Data Binding Documentation}
   */
  getBindableArtboard(name: string): BindableArtboard;
}

export interface RiveFileFactory
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  fromURL(
    url: string,
    loadCdn: boolean,
    referencedAssets?: ReferencedAssetsType
  ): Promise<RiveFile>;
  fromFileURL(
    fileURL: string,
    loadCdn: boolean,
    referencedAssets?: ReferencedAssetsType
  ): Promise<RiveFile>;
  fromResource(
    resource: string,
    loadCdn: boolean,
    referencedAssets?: ReferencedAssetsType
  ): Promise<RiveFile>;
  fromBytes(
    bytes: ArrayBuffer,
    loadCdn: boolean,
    referencedAssets?: ReferencedAssetsType
  ): Promise<RiveFile>;
}
