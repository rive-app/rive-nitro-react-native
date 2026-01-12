import type { HybridObject } from 'react-native-nitro-modules';

/**
 * A bindable artboard that can be assigned to a {@link ViewModelArtboardProperty}.
 * Created via {@link RiveFile.getBindableArtboard}.
 *
 * Used for data binding artboards - swapping artboard sources at runtime.
 * @see {@link https://rive.app/docs/runtimes/data-binding Rive Data Binding Documentation}
 */
export interface BindableArtboard
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /** The name of the artboard */
  readonly artboardName: string;
}
