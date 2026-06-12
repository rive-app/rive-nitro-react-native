import { useEffect, useRef, type ComponentProps } from 'react';
import { NitroRiveView } from './NitroRiveViewComponent';
import { RiveErrorType, type RiveError } from './Errors';
import { callDispose } from './callDispose';
import type { RiveViewRef } from '../index';
import type { RiveFileSchema, TypedRiveFile } from './TypedRiveFile';

type NitroRiveViewProps = ComponentProps<typeof NitroRiveView>;

export interface RiveViewProps<
  T extends RiveFileSchema = RiveFileSchema,
  A extends T['artboards'] = T['defaultArtboard']
> extends Omit<NitroRiveViewProps, 'onError' | 'file' | 'artboardName' | 'stateMachineName'> {
  onError?: (error: RiveError) => void;
  file: TypedRiveFile<T>;
  /** Name of the artboard to display. When using a generated schema, only valid artboard names are accepted. */
  artboardName?: A;
  /**
   * Name of the state machine to play.
   * Constrained to the selected artboard's state machines, or the default artboard's if none is specified.
   */
  stateMachineName?: T['stateMachines'][A];
}

const defaultOnError = (error: RiveError) =>
  console.error(`[${RiveErrorType[error.type]}] ${error.message}`);

export function RiveView<
  T extends RiveFileSchema = RiveFileSchema,
  A extends T['artboards'] = T['defaultArtboard']
>(props: RiveViewProps<T, A>) {
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
