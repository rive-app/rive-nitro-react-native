import { useRef, useCallback, useState } from 'react';
import type { RiveViewRef } from 'react-native-rive';

export function useRive() {
  const riveRef = useRef<RiveViewRef>(null);
  const [riveViewRef, setRiveViewRef] = useState<RiveViewRef | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setRef = useCallback((node: RiveViewRef | null) => {
    if (riveRef.current !== node) {
      riveRef.current = node;

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const timeout = new Promise((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error('Rive view ready timeout'));
        }, 5000);
      });

      // TODO: Need to clear out the awaitViewReady promise if it times out
      // or add this timeout natively and return false
      Promise.race([node?.awaitViewReady(), timeout])
        .then((result) => {
          if (result === true) {
            setRiveViewRef(node);
          } else {
            console.warn('Rive view ready check returned false');
            setRiveViewRef(null);
          }
        })
        .catch((error) => {
          console.warn('Failed to initialize Rive view:', error);
          setRiveViewRef(null);
        })
        .finally(() => {
          // Clear the timeout in both success and error cases
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        });
    }
  }, []);

  return {
    riveRef,
    riveViewRef,
    setHybridRef: {
      f: setRef,
    },
  };
}
