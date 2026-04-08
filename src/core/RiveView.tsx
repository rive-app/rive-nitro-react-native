import { useEffect, useRef, type ComponentProps } from 'react';
import { NitroRiveView } from './NitroRiveViewComponent';
import { RiveErrorType, type RiveError } from './Errors';
import { callDispose } from './callDispose';
import type { RiveViewRef } from '../index';

export interface RiveViewProps
  extends Omit<ComponentProps<typeof NitroRiveView>, 'onError'> {
  onError?: (error: RiveError) => void;
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
 * @property {Object} [style] - React Native style object for container customization
 * @property {(error: RiveError) => void} [onError] - Callback function that is called when an error occurs
 *
 * The component also exposes methods for controlling playback:
 * - play(): Starts playing the Rive graphic
 * - pause(): Pauses the Rive graphic
 */
export function RiveView(props: RiveViewProps) {
  const { onError, hybridRef: userHybridRef, ...rest } = props;
  const wrappedOnError = onError ?? defaultOnError;
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
      hybridRef={{ f: setRef }}
    />
  );
}
