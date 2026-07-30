import { useEffect, useRef, type ComponentProps } from 'react';
import { NitroRiveView } from './NitroRiveViewComponent';
import { RiveErrorType, type RiveError } from './Errors';
import { callDispose } from './callDispose';
import type { RiveViewRef } from '../index';

export interface RiveViewProps
  extends Omit<
    ComponentProps<typeof NitroRiveView>,
    'onError' | 'onStop' | 'renderEnabled'
  > {
  onError?: (error: RiveError) => void;
  /**
   * Called when the animation/state machine stops playing, e.g. when a
   * non-looping animation reaches its end. Not called for pause() — only
   * when playback naturally comes to rest. Useful for splash-screen-style
   * animations where you want to navigate away once playback finishes.
   */
  onStop?: () => void;
  /**
   * Manual control over rendering, for occlusion the view cannot detect
   * itself (e.g. covered by a Modal or a bottom sheet): false skips draws
   * while the state machine keeps advancing, 'pause' also stops advancing —
   * like an imperative pause() that composes with the ref methods. Defaults
   * to true. New runtimes only; on iOS false behaves like true ('pause' is
   * fully supported).
   */
  renderEnabled?: boolean | 'pause';
}

const defaultOnError = (error: RiveError) =>
  console.error(`[${RiveErrorType[error.type]}] ${error.message}`);

const defaultOnStop = () => {};

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
 * @property {OffscreenBehavior} [offscreenBehavior='none'] - What to do while the view is outside the visible viewport: keep running, keep advancing but skip draws, or pause (new runtimes only)
 * @property {boolean | 'pause'} [renderEnabled=true] - false skips drawing while the state machine keeps advancing; 'pause' also stops advancing, for views covered by UI the view can't detect (new runtimes only)
 * @property {Object} [style] - React Native style object for container customization
 * @property {(error: RiveError) => void} [onError] - Callback function that is called when an error occurs
 * @property {() => void} [onStop] - Callback function that is called when the animation/state machine stops playing (e.g. reaches the end of a non-looping animation)
 *
 * The component also exposes methods for controlling playback:
 * - play(): Starts playing the Rive graphic
 * - pause(): Pauses the Rive graphic
 */
export function RiveView(props: RiveViewProps) {
  const { onError, onStop, hybridRef: userHybridRef, ...rest } = props;
  const wrappedOnError = onError ?? defaultOnError;
  const wrappedOnStop = onStop ?? defaultOnStop;
  const viewRef = useRef<RiveViewRef | null>(null);

  useEffect(() => {
    return () => {
      if (viewRef.current) {
        callDispose(viewRef.current);
        viewRef.current = null;
      }
    };
  }, []);

  const setRef = (ref: RiveViewRef) => {
    viewRef.current = ref;
    if (userHybridRef?.f) {
      userHybridRef.f(ref);
    }
  };

  return (
    <NitroRiveView
      {...rest}
      onError={{ f: wrappedOnError }}
      onStop={{ f: wrappedOnStop }}
      hybridRef={{ f: setRef }}
    />
  );
}
