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
