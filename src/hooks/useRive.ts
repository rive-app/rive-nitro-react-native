import { useRef, useCallback, useState } from 'react';
import type { HybridView } from 'react-native-nitro-modules';
import type { RiveViewProps, RiveViewMethods } from 'react-native-rive';

export function useRive() {
  const riveRef = useRef<HybridView<RiveViewProps, RiveViewMethods>>(null);
  const [riveViewRef, setRiveViewRef] = useState<HybridView<
    RiveViewProps,
    RiveViewMethods
  > | null>(null);

  const setRef = useCallback(
    (node: HybridView<RiveViewProps, RiveViewMethods> | null) => {
      if (riveRef.current !== node) {
        riveRef.current = node;
        setRiveViewRef(node);
      }
    },
    []
  );

  return {
    riveRef,
    riveViewRef,
    setHybridRef: {
      f: setRef,
    },
  };
}
