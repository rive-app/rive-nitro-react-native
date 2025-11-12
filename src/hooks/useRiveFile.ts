import { useState, useEffect, useMemo } from 'react';
import type { ResolvedReferencedAsset } from '../specs/RiveFile.nitro';
import type { RiveFile } from '../index';
import {
  loadRiveFile,
  resolveReferencedAssets,
} from '../utils/riveFileLoading';
import { useReferencedAssetsUpdate } from './useReferencedAssetsUpdate';

export type RiveFileInput = number | { uri: string } | string | ArrayBuffer;

type ReferencedAsset = { source: number | { uri: string } };

export interface ReferencedAssets {
  [assetName: string]: ReferencedAsset;
}

export type UseRiveFileOptions = {
  referencedAssets?: ReferencedAssets;
};

type RiveFileHookResult =
  | { riveFile: RiveFile; isLoading: false; error: null }
  | { riveFile: null; isLoading: true; error: null }
  | { riveFile: null; isLoading: false; error: string };

export type ResolvedReferencedAssets = {
  [assetName: string]: ResolvedReferencedAsset;
};

export function useRiveFile(
  input: RiveFileInput | undefined,
  options: UseRiveFileOptions = {}
): RiveFileHookResult {
  const [result, setResult] = useState<RiveFileHookResult>({
    riveFile: null,
    isLoading: true,
    error: null,
  });
  const referencedAssets = useMemo(
    () => resolveReferencedAssets(options.referencedAssets),
    [options.referencedAssets]
  );

  useEffect(() => {
    let currentFile: RiveFile | null = null;

    const loadFile = async () => {
      try {
        if (input == null) {
          setResult({
            riveFile: null,
            isLoading: false,
            error: 'No Rive file input provided.',
          });
          return;
        }

        currentFile = await loadRiveFile(input, referencedAssets);
        setResult({ riveFile: currentFile, isLoading: false, error: null });
      } catch (err) {
        console.error(err);
        setResult({
          riveFile: null,
          isLoading: false,
          error:
            err instanceof Error
              ? err.message || 'Unknown error'
              : 'Failed to load Rive file',
        });
      }
    };

    loadFile();

    return () => {
      if (currentFile) {
        currentFile.release();
      }
    };
  }, [input, referencedAssets]);

  useReferencedAssetsUpdate(result.riveFile, referencedAssets);

  return {
    riveFile: result.riveFile,
    isLoading: result.isLoading,
    error: result.error,
  } as RiveFileHookResult;
}
