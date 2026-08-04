import type {
  HybridView,
  HybridViewProps,
  HybridViewMethods,
} from 'react-native-nitro-modules';
import type { RiveFile } from './RiveFile.nitro';
import { Fit } from '../core/Fit';
import { Semantics } from '../core/Semantics';
import type { ViewModelInstance } from './ViewModel.nitro';
import type { Alignment } from '../core/Alignment';
import type { UnifiedRiveEvent, RiveEvent } from '../core/Events';
import type { RiveError } from '../core/Errors';

export enum DataBindMode {
  Auto,
  None,
}
export interface DataBindByName {
  byName: string;
}

/**
 * A frame rate range for the render loop, mirroring CAFrameRateRange.
 * The system picks a rate between minimum and maximum, ideally preferred.
 */
export interface FrameRateRange {
  minimum: number;
  maximum: number;
  preferred?: number;
}

/**
 * What to do while the view is outside the visible viewport (scrolled out of
 * view, hidden, or detached from a window). See RiveViewProps.offscreenBehavior.
 */
export type OffscreenBehavior = 'none' | 'skip-draws' | 'pause';

/**
 * Props interface for the RiveView component.
 * Extends HybridViewProps to include Rive-specific properties.
 */
export interface RiveViewProps extends HybridViewProps {
  /** Name of the artboard to display from the Rive file */
  artboardName?: string;
  /** Name of the state machine to play */
  stateMachineName?: string;
  /** Whether to automatically start playing the state machine */
  autoPlay?: boolean;
  /** The Rive file to be displayed */
  file: RiveFile;
  /** How the Rive graphic should be aligned within its container */
  alignment?: Alignment;
  /** How the Rive graphic should fit within its container */
  fit?: Fit;
  /** The scale factor to apply to the Rive graphic when using Fit.Layout */
  layoutScaleFactor?: number;
  /**
   * Preferred frame rate for the render loop. A number caps rendering at that
   * many frames per second; a FrameRateRange maps to CAFrameRateRange on iOS,
   * while Android applies it best-effort as a cap at preferred ?? maximum.
   * Useful to reduce the CPU/battery cost of long-running looping animations
   * that don't need the display's full refresh rate (e.g. loaders on 120Hz
   * screens). Capping limits frame production, not animation time — playback
   * still advances by the real elapsed time between frames.
   *
   * Only supported on the new (default) runtimes; the legacy
   * backends ignore it. Undefined = render at the display refresh rate.
   *
   * @see https://rive.app/docs/runtimes/apple/apple#frame-rate
   */
  frameRate?: number | FrameRateRange;
  /**
   * What to do while the view is outside the visible viewport (scrolled out
   * of view, hidden, or detached from a window). Views covered by an overlay
   * in the same window (e.g. a React Native Modal) still count as visible —
   * use renderEnabled for occlusion the view cannot detect.
   *
   * - 'none' (default): keep advancing and drawing regardless of visibility.
   * - 'skip-draws': keep advancing the state machine but skip drawing frames
   *   while offscreen. Events, data binding and playback time stay live, so
   *   this is safe even when other UI is driven from the state machine.
   * - 'pause': stop advancing and drawing while offscreen; playback resumes
   *   from where it left off when the view becomes visible again. The state
   *   machine does not advance while offscreen, so don't use it when
   *   data-binding consumers rely on it advancing regardless of visibility.
   *
   * Only supported on the new (default) runtimes; the legacy backends ignore
   * it. On iOS the upstream runtime couples advancing and drawing, so
   * 'skip-draws' behaves like 'none' there ('pause' is fully supported, and
   * iOS already throttles most offscreen rendering on its own).
   */
  offscreenBehavior?: OffscreenBehavior;
  /**
   * Manual control over rendering, for occlusion the view cannot detect
   * itself — e.g. covered by a Modal or a bottom sheet. Use
   * offscreenBehavior instead for visibility the view can detect (scrolling,
   * hiding). Defaults to true.
   *
   * - true (default): render normally.
   * - false: stop drawing frames while the state machine keeps advancing
   *   (events, data binding, and playback time stay live). The view repaints
   *   on the next frame after re-enabling.
   * - 'pause': also stop advancing the state machine, like an imperative
   *   pause(); playback resumes where it left off when the prop changes
   *   back. Unlike pause()/play() this doesn't touch the playback state the
   *   ref methods control — the two combine.
   *
   * Only supported on the new (default) runtimes; the legacy backends ignore
   * it. On iOS the upstream runtime couples advancing and drawing, so false
   * behaves like true there ('pause' is fully supported, and fullscreen iOS
   * modals already hide the covered hierarchy).
   *
   * Typed as `boolean | string` because Nitro cannot mix string literals
   * into a variant; the public RiveView component narrows it to
   * `boolean | 'pause'`. Strings other than 'pause' render normally.
   */
  renderEnabled?: boolean | string;
  /**
   * Exposes accessibility semantics authored in the Rive editor to the
   * platform screen reader (VoiceOver). Defaults to Semantics.Off.
   *
   * Only supported on the new (default) iOS runtime so far; ignored
   * elsewhere. Android support is pending the upstream rive-android runtime.
   *
   * @see https://rive.app/docs/runtimes/apple/semantics
   */
  semantics?: Semantics;
  /** The view model instance to bind, to the state machine. Defaults to DataBindMode.Auto */
  dataBind?: ViewModelInstance | DataBindMode | DataBindByName;
  /** Callback function that is called when an error occurs */
  onError: (error: RiveError) => void;
  /**
   * Callback function that is called when the animation/state machine stops
   * playing, e.g. when a non-looping animation reaches its end. Not called
   * for pause() — only when playback naturally comes to rest.
   */
  onStop: () => void;
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
  /**
   * Gets the currently bound view model instance from the Rive view
   * @returns The bound ViewModelInstance, or null if none is bound
   */
  getViewModelInstance(): ViewModelInstance | undefined;
  /** Starts playing the Rive graphic */
  play(): Promise<void>;
  /** Pauses the the Rive graphic */
  pause(): Promise<void>;
  /**
   * Resets the Rive graphic to its initial state.
   * @deprecated Not supported on the new runtime (logs an error and
   * does nothing).
   */
  reset(): Promise<void>;

  /** play if needed: low overhead function to make sure the rive graphics is playing. Use after property value update, to make sure graphics is updated */
  playIfNeeded(): void;

  /**
   * Adds an event listener to the Rive view
   * @deprecated No longer supported — throws. Use data binding instead:
   * https://rive.app/docs/runtimes/data-binding
   * @param onEvent - The function to call when an event is triggered
   */
  onEventListener(onEvent: (event: UnifiedRiveEvent) => void): void;
  /**
   * Removes all event listeners from the Rive view
   * @deprecated No longer supported — throws. Use data binding instead:
   * https://rive.app/docs/runtimes/data-binding
   */
  removeEventListeners(): void;
  /**
   * Sets a number state machine input on the Rive view
   * @deprecated No longer supported — throws. Use data binding instead:
   * https://rive.app/docs/runtimes/data-binding
   * @param name - The name of the state machine input
   * @param value - The value to set the state machine input to
   * @param path - The optional path to the state machine input on a nested artboard
   */
  setNumberInputValue(name: string, value: number, path?: string): void;
  /**
   * Gets a number state machine input from the Rive view
   * @deprecated No longer supported — throws. Use data binding instead:
   * https://rive.app/docs/runtimes/data-binding
   * @param name - The name of the state machine input
   * @param path - The optional path to the state machine input on a nested artboard
   * @returns The value of the state machine input
   */
  getNumberInputValue(name: string, path?: string): number;
  /**
   * Sets a boolean state machine input on the Rive view
   * @deprecated No longer supported — throws. Use data binding instead:
   * https://rive.app/docs/runtimes/data-binding
   * @param name - The name of the state machine input
   * @param value - The value to set the state machine input to
   * @param path - The optional path to the state machine input on a nested artboard
   */
  setBooleanInputValue(name: string, value: boolean, path?: string): void;
  /**
   * Gets a boolean state machine input from the Rive view
   * @deprecated No longer supported — throws. Use data binding instead:
   * https://rive.app/docs/runtimes/data-binding
   * @param name - The name of the state machine input
   * @param path - The optional path to the state machine input on a nested artboard
   * @returns The value of the state machine input
   */
  getBooleanInputValue(name: string, path?: string): boolean;
  /**
   * Triggers a trigger state machine input on the Rive view
   * @deprecated No longer supported — throws. Use data binding instead:
   * https://rive.app/docs/runtimes/data-binding
   * @param name - The name of the state machine input
   * @param path - The optional path to the state machine input on a nested artboard
   */
  triggerInput(name: string, path?: string): void;
  /**
   * Sets the text run value on the Rive view
   * @deprecated No longer supported — throws. Use data binding instead:
   * https://rive.app/docs/runtimes/data-binding
   * @param name - The name of the text run
   * @param value - The text to set the text run value to
   * @param path - The optional path to the text run on a nested artboard
   */
  setTextRunValue(name: string, value: string, path?: string): void;
  /**
   * Gets the text run value from the Rive view
   * @deprecated No longer supported — throws. Use data binding instead:
   * https://rive.app/docs/runtimes/data-binding
   * @param name - The name of the text run
   * @param path - The optional path to the text run on a nested artboard
   * @returns The text run value
   */
  getTextRunValue(name: string, path?: string): string;
}

export type RiveViewTSMethods = Exclude<RiveViewMethods, 'onEventListener'> & {
  onEventListener(onEvent: (event: RiveEvent) => void): void;
};

/**
 * Type definition for the RiveView component.
 * Combines RiveViewProps and RiveViewMethods with the HybridView type.
 */
export type RiveView = HybridView<RiveViewProps, RiveViewMethods>;
