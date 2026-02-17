import type { HybridObject } from 'react-native-nitro-modules';
import type { ViewModel } from './ViewModel.nitro';
import type { ArtboardBy } from './ArtboardBy';
import type { RiveImage } from './RiveImage.nitro';
import type { BindableArtboard } from './BindableArtboard.nitro';

/**
 * Represents an enum definition from a Rive file.
 * Useful for debugging and building dynamic UIs based on available enum values.
 */
export interface RiveEnumDefinition {
  /** The name of the enum (e.g., "Status") */
  readonly name: string;
  /** All possible values for this enum (e.g., ["Active", "Inactive", "Pending"]) */
  readonly values: string[];
}

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
  /** @deprecated Use getViewModelNamesAsync instead */
  readonly viewModelCount?: number;
  /** @deprecated Use getViewModelNamesAsync + viewModelByNameAsync instead */
  viewModelByIndex(index: number): ViewModel | undefined;
  /** @deprecated Use viewModelByNameAsync instead */
  viewModelByName(name: string): ViewModel | undefined;
  /** @deprecated Use defaultArtboardViewModelAsync instead */
  defaultArtboardViewModel(artboardBy?: ArtboardBy): ViewModel | undefined;
  updateReferencedAssets(referencedAssets: ReferencedAssetsType): void;

  /** @deprecated Use getArtboardCountAsync instead */
  readonly artboardCount: number;
  /** @deprecated Use getArtboardNamesAsync instead */
  readonly artboardNames: string[];

  /** The names of all view models in the Rive file */
  getViewModelNamesAsync(): Promise<string[]>;
  /** Get a view model by name, optionally validating its properties */
  viewModelByNameAsync(
    name: string,
    validate?: boolean
  ): Promise<ViewModel | undefined>;
  /** Get the default view model for the given artboard */
  defaultArtboardViewModelAsync(
    artboardBy?: ArtboardBy
  ): Promise<ViewModel | undefined>;
  /** The number of artboards in the Rive file */
  getArtboardCountAsync(): Promise<number>;
  /** The names of all artboards in the Rive file */
  getArtboardNamesAsync(): Promise<string[]>;
  /**
   * Get a bindable artboard by name for use with data binding.
   * @throws Error if artboard with the given name is not found
   * @see {@link https://rive.app/docs/runtimes/data-binding Rive Data Binding Documentation}
   */
  getBindableArtboard(name: string): BindableArtboard;

  /**
   * Get all enums defined in this Rive file.
   * Useful for debugging and building dynamic UIs.
   * @experimental Uses the experimental Rive API on iOS
   */
  getEnums(): Promise<RiveEnumDefinition[]>;
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
