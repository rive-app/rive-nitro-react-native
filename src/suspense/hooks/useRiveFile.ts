import { useMemo } from 'react';
import type { RiveFile } from '../../specs/RiveFile.nitro';
import type { RiveFileInput, ReferencedAssets } from '../../hooks/useRiveFile';
import { useRiveFileCacheContext } from '../context/RiveFileCacheContext';
import { generateCacheKey } from '../cache';
import {
  loadRiveFile,
  resolveReferencedAssets,
} from '../../utils/riveFileLoading';
import { useReferencedAssetsUpdate } from '../../hooks/useReferencedAssetsUpdate';

export interface UseRiveFileSuspenseOptions {
  cacheId?: string;
  referencedAssets?: ReferencedAssets;
}

export function useRiveFile(
  input: RiveFileInput,
  options: UseRiveFileSuspenseOptions = {}
): RiveFile {
  const { cache } = useRiveFileCacheContext();

  const cacheKey = useMemo(() => {
    return options.cacheId ?? generateCacheKey(input);
  }, [input, options.cacheId]);

  const referencedAssets = useMemo(
    () => resolveReferencedAssets(options.referencedAssets),
    [options.referencedAssets]
  );

  let entry = cache.get(cacheKey);

  if (!entry) {
    const promise = loadRiveFile(input, referencedAssets)
      .then((riveFile) => {
        const currentEntry = cache.get(cacheKey);
        if (currentEntry) {
          currentEntry.riveFile = riveFile;
          currentEntry.promise = undefined;
          currentEntry.refCount++;
        } else {
          cache.set(cacheKey, {
            riveFile,
            promise: undefined,
            refCount: 1,
          });
        }
        return riveFile;
      })
      .catch((error) => {
        const currentEntry = cache.get(cacheKey);
        if (currentEntry) {
          currentEntry.error = error;
          currentEntry.promise = undefined;
        } else {
          cache.set(cacheKey, {
            riveFile: null as any,
            promise: undefined,
            error,
            refCount: 0,
          });
        }
        throw error;
      });

    entry = {
      riveFile: null as any,
      promise,
      refCount: 1,
    };

    cache.set(cacheKey, entry);
  } else {
    entry.refCount++;
  }

  if (entry.error) {
    throw entry.error;
  }

  if (entry.promise) {
    throw entry.promise;
  }

  const riveFile = entry.riveFile;

  useReferencedAssetsUpdate(riveFile, referencedAssets);

  return riveFile;
}
