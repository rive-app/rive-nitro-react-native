import type {
  HybridView,
  HybridViewProps,
  HybridViewMethods,
} from 'react-native-nitro-modules';
import type { RiveFile } from './RiveFile.nitro';
import { Fit } from '../core/Fit';
import type { ViewModelInstance } from './ViewModel.nitro';
import type { Alignment } from '../core/Alignment';

/**
 * Props interface for the RiveView component.
 * Extends HybridViewProps to include Rive-specific properties.
 */
export interface RiveViewProps extends HybridViewProps {
  /** Name of the artboard to display from the Rive file */
  artboardName?: string;
  /** Name of the state machine to play */
  stateMachineName?: string;
  /** Whether to automatically bind the state machine and artboard */
  autoBind?: boolean;
  /** Whether to automatically start playing the state machine */
  autoPlay?: boolean;
  /** The Rive file to be displayed */
  file: RiveFile;
  /** How the Rive graphic should be aligned within its container */
  alignment?: Alignment;
  /** How the Rive graphic should fit within its container */
  fit?: Fit;
}

/**
 * Methods interface for the RiveView component.
 * Extends HybridViewMethods to include Rive-specific methods.
 */
export interface RiveViewMethods extends HybridViewMethods {
  /** Binds the view model instance to the Rive view */
  bindViewModelInstance(viewModelInstance: ViewModelInstance): void;
  /** Starts playing the Rive graphic */
  play(): void;
  /** Pauses the the Rive graphic */
  pause(): void;
}

/**
 * Type definition for the RiveView component.
 * Combines RiveViewProps and RiveViewMethods with the HybridView type.
 */
export type RiveView = HybridView<RiveViewProps, RiveViewMethods>;
