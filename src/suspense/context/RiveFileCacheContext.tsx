import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { createRiveFileCache, type RiveFileCache } from '../cache';

export interface RiveFileCacheProviderProps {
  children: ReactNode;
}

interface RiveFileCacheContextValue {
  cache: RiveFileCache;
}

const RiveFileCacheContext = createContext<RiveFileCacheContextValue | null>(
  null
);

export function RiveFileCacheProvider({
  children,
}: RiveFileCacheProviderProps) {
  const cache = useMemo(() => createRiveFileCache(), []);

  useEffect(() => {
    return () => {
      cache.clear();
    };
  }, [cache]);

  const contextValue = useMemo<RiveFileCacheContextValue>(
    () => ({ cache }),
    [cache]
  );

  return (
    <RiveFileCacheContext.Provider value={contextValue}>
      {children}
    </RiveFileCacheContext.Provider>
  );
}

export function useRiveFileCacheContext(): RiveFileCacheContextValue {
  const context = useContext(RiveFileCacheContext);

  if (!context) {
    throw new Error(
      'useRiveFileCacheContext must be used within RiveSuspense.Provider'
    );
  }

  return context;
}
