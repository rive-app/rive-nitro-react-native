import type {
  HybridView,
  HybridViewProps,
  HybridViewMethods,
} from 'react-native-nitro-modules';
import type { RiveFile } from './RiveFile.nitro';
import { Fit } from '../core/Fit';
import type { ViewModelInstance } from './ViewModel.nitro';
import type { Alignment } from '../core/Alignment';
import type { RiveEvent } from '../core/Events';

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
  /**
   * Waits for the Rive view to be ready
   * @returns A boolean promise that resolves when the Rive view is ready
   */
  awaitViewReady(): Promise<boolean>;
  /** Binds the view model instance to the Rive view */
  bindViewModelInstance(viewModelInstance: ViewModelInstance): void;
  /** Starts playing the Rive graphic */
  play(): void;
  /** Pauses the the Rive graphic */
  pause(): void;
  /**
   * Adds an event listener to the Rive view
   * @param onEvent - The function to call when an event is triggered
   */
  onEventListener(onEvent: (event: RiveEvent) => void): void;
  /** Removes all event listeners from the Rive view */
  removeEventListeners(): void;
  /**
   * Sets a number state machine input on the Rive view
   * @param name - The name of the state machine input
   * @param value - The value to set the state machine input to
   * @param path - The optional path to the state machine input on a nested artboard
   */
  setNumberInputValue(name: string, value: number, path?: string): void;
  /**
   * Gets a number state machine input from the Rive view
   * @param name - The name of the state machine input
   * @param path - The optional path to the state machine input on a nested artboard
   * @returns The value of the state machine input
   */
  getNumberInputValue(name: string, path?: string): number;
  /**
   * Sets a boolean state machine input on the Rive view
   * @param name - The name of the state machine input
   * @param value - The value to set the state machine input to
   * @param path - The optional path to the state machine input on a nested artboard
   */
  setBooleanInputValue(name: string, value: boolean, path?: string): void;
  /**
   * Gets a boolean state machine input from the Rive view
   * @param name - The name of the state machine input
   * @param path - The optional path to the state machine input on a nested artboard
   * @returns The value of the state machine input
   */
  getBooleanInputValue(name: string, path?: string): boolean;
  /**
   * Triggers a trigger state machine input on the Rive view
   * @param name - The name of the state machine input
   * @param path - The optional path to the state machine input on a nested artboard
   */
  triggerInput(name: string, path?: string): void;
}

/**
 * Type definition for the RiveView component.
 * Combines RiveViewProps and RiveViewMethods with the HybridView type.
 */
export type RiveView = HybridView<RiveViewProps, RiveViewMethods>;
