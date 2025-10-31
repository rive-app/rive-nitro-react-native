import type { HybridObject } from 'react-native-nitro-modules';
import type { ViewModel } from './ViewModel.nitro';
import type { ArtboardBy } from './ArtboardBy';

/**
 * A Rive file (.riv) as created in the Rive editor.
 */
export interface RiveFile
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /** The number of view models in the Rive file */
  readonly viewModelCount?: number;
  /** Get a view model by index */
  viewModelByIndex(index: number): ViewModel | null;
  /** Get a view model by name */
  viewModelByName(name: string): ViewModel | null;
  /** Returns the default view model for the provided artboard */
  defaultArtboardViewModel(artboardBy?: ArtboardBy): ViewModel | null;
  /** Release the Rive file. Important to call when done with the file to free resources. */
  release(): void; // TODO: Switch to `dispose`: https://github.com/mrousavy/nitro/issues/668
}

export interface RiveFileFactory
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  fromURL(url: string, loadCdn: boolean): Promise<RiveFile>;
  fromFileURL(fileURL: string, loadCdn: boolean): Promise<RiveFile>;
  fromResource(resource: string, loadCdn: boolean): Promise<RiveFile>;
  fromBytes(bytes: ArrayBuffer, loadCdn: boolean): Promise<RiveFile>;
}
