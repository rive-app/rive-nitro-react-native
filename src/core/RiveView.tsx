import { useRef, type ComponentProps } from 'react';
import { NitroRiveView } from './NitroRiveViewComponent';
import { RiveErrorType, type RiveError } from './Errors';
import { callDispose } from './callDispose';
import { useUnmountEffect } from '../hooks/useUnmountEffect';
import type { RiveViewRef } from '../index';
import type {
  RiveFileSource,
  RiveFileSchema,
  SchemaOf,
  TypedRiveFile,
} from './TypedRiveFile';

type NitroRiveViewProps = ComponentProps<typeof NitroRiveView>;

// T accepts a schema OR a RiveFileSource (i.e. `typeof importedRiv`), matching
// TypedRiveFile. A schema-only constraint would make inference silently fall
// back to the base schema — and disable all name checking — whenever the file
// is annotated as TypedRiveFile<typeof asset>.
export interface RiveViewProps<
  T extends RiveFileSchema | RiveFileSource = RiveFileSchema,
  A extends SchemaOf<T>['artboards'] = SchemaOf<T>['defaultArtboard'],
> extends Omit<
    NitroRiveViewProps,
    'onError' | 'file' | 'artboardName' | 'stateMachineName' | 'renderEnabled'
  > {
  onError?: (error: RiveError) => void;
  /**
   * Manual control over rendering, for occlusion the view cannot detect
   * itself (e.g. a screen pushed over it by a JS stack navigator, a Modal, or
   * a bottom sheet): false skips draws while the state machine keeps
   * advancing (Android only), 'pause' also stops advancing — like an
   * imperative pause() that composes with the ref methods. Defaults to true.
   * New runtimes only.
   */
  renderEnabled?: boolean | 'pause';
  file: TypedRiveFile<T>;
  /** Name of the artboard to display. When using a generated schema, only valid artboard names are accepted. */
  artboardName?: A;
  /**
   * Name of the state machine to play.
   * Constrained to the selected artboard's state machines, or the default artboard's if none is specified.
   */
  stateMachineName?: SchemaOf<T>['stateMachines'][A];
}

const defaultOnError = (error: RiveError) =>
  console.error(`[${RiveErrorType[error.type]}] ${error.message}`);

/**
 * RiveView is a React Native component that renders Rive graphics.
 * It provides a seamless way to display and control Rive graphics in your app.
 *
 * @example
 * ```tsx
 * <RiveView
 *   file={riveFile}
 *   artboardName="New Artboard"
 *   stateMachineName="State Machine 1"
 *   autoPlay={true}
 *   fit={Fit.Contain}
 *   style={styles.riveContainer}
 * />
 * ```
 *
 * @property {RiveFile} file - The Rive file to be displayed
 * @property {string} [artboardName] - Name of the artboard to display from the Rive file
 * @property {string} [stateMachineName] - Name of the state machine to play
 * @property {ViewModelInstance | DataBindMode | DataBindByName} [dataBind] - Data binding configuration for the state machine, defaults to DataBindMode.Auto
 * @property {boolean} [autoPlay=true] - Whether to automatically start playing the state machine
 * @property {Alignment} [alignment] - How the Rive graphic should be aligned within its container
 * @property {Fit} [fit] - How the Rive graphic should fit within its container
 * @property {number | FrameRateRange} [frameRate] - Preferred frame rate for the render loop (new runtimes only)
 * @property {OffscreenBehavior} [offscreenBehavior='none'] - What to do while the view is outside the visible viewport: keep running, keep advancing but skip draws (Android only), or pause (new runtimes only)
 * @property {boolean | 'pause'} [renderEnabled=true] - false skips drawing while the state machine keeps advancing (Android only); 'pause' also stops advancing, for views covered by UI the view can't detect (new runtimes only)
 * @property {Object} [style] - React Native style object for container customization
 * @property {(error: RiveError) => void} [onError] - Callback function that is called when an error occurs
 *
 * The component also exposes methods for controlling playback:
 * - play(): Starts playing the Rive graphic
 * - pause(): Pauses the Rive graphic
 */
export function RiveView<
  T extends RiveFileSchema | RiveFileSource = RiveFileSchema,
  A extends SchemaOf<T>['artboards'] = SchemaOf<T>['defaultArtboard'],
>(props: RiveViewProps<T, A>) {
  const { onError, hybridRef: userHybridRef, ...rest } = props;
  const wrappedOnError = onError ?? defaultOnError;
  const viewRef = useRef<RiveViewRef | null>(null);

  useUnmountEffect(() => {
    if (viewRef.current) {
      callDispose(viewRef.current);
      viewRef.current = null;
    }
  });

  const setRef = (ref: RiveViewRef) => {
    // Fabric on iOS creates a new native view when an `<Activity>` reveals
    // this component; the view it replaced is gone from the screen.
    if (viewRef.current && viewRef.current !== ref) {
      callDispose(viewRef.current);
    }
    viewRef.current = ref;
    if (userHybridRef?.f) {
      userHybridRef.f(ref);
    }
  };

  return (
    <NitroRiveView
      {...rest}
      onError={{ f: wrappedOnError }}
      hybridRef={{ f: setRef }}
    />
  );
}
