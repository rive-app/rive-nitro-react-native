import type { ComponentProps } from 'react';
import { NitroRiveView } from 'react-native-rive';
import type { RiveError } from './Errors';

export interface RiveViewProps
  extends Omit<ComponentProps<typeof NitroRiveView>, 'onError'> {
  onError?: (error: RiveError) => void;
}

const defaultOnError = (error: RiveError) => console.error(error.message);

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
 * @property {ViewModelInstance | DataBindMode | DataBindByName} [dataBind] - Data binding configuration for the state machine
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
  const { onError, ...rest } = props;
  const wrappedOnError = onError ?? defaultOnError;

  return <NitroRiveView {...(rest as any)} onError={{ f: wrappedOnError }} />;
}
