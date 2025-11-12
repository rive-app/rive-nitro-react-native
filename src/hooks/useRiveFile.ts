import { useState, useEffect, useMemo, useRef } from 'react';
import { Image } from 'react-native';
import { RiveFileFactory, type RiveFile } from '../index';
import type { ResolvedReferencedAsset } from '../specs/RiveFile.nitro';

export type RiveFileInput = number | { uri: string } | string | ArrayBuffer;

type ReferencedAsset = { source: number | { uri: string } };

export interface ReferencedAssets {
  [assetName: string]: ReferencedAsset;
}

export type ResolvedReferencedAssets = {
  [assetName: string]: ResolvedReferencedAsset;
};

export type UseRiveFileOptions = {
  referencedAssets?: ReferencedAssets;
};

function parsePossibleSources(
  source: ReferencedAsset['source']
): ResolvedReferencedAsset {
  if (typeof source === 'number') {
    const resolvedAsset = Image.resolveAssetSource(source);
    if (resolvedAsset && resolvedAsset.uri) {
      return { sourceAssetId: resolvedAsset.uri };
    } else {
      throw new Error('Invalid asset source provided.');
    }
  }

  const uri = (source as any).uri;
  if (typeof source === 'object' && uri) {
    return { sourceUrl: uri };
  }

  const asset = (source as any).fileName;
  const path = (source as any).path;

  if (typeof source === 'object' && asset) {
    const result: ResolvedReferencedAsset = { sourceAsset: asset };

    if (path) {
      result.path = path;
    }

    return result;
  }

  throw new Error('Invalid source provided.');
}

function transformFilesHandledMapping(
  mapping?: ReferencedAssets
): ResolvedReferencedAssets | undefined {
  const transformedMapping: ResolvedReferencedAssets = {};
  if (mapping === undefined) {
    return undefined;
  }

  Object.entries(mapping).forEach(([key, option]) => {
    transformedMapping[key] = parsePossibleSources(option.source);
  });

  return transformedMapping;
}

type RiveFileHookResult =
  | { riveFile: RiveFile; isLoading: false; error: null }
  | { riveFile: null; isLoading: true; error: null }
  | { riveFile: null; isLoading: false; error: string };

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
    () => transformFilesHandledMapping(options.referencedAssets),
    [options.referencedAssets]
  );
  const initialReferencedAssets = useRef(referencedAssets);
  const initialInput = useRef(input);

  useEffect(() => {
    let currentFile: RiveFile | null = null;

    const loadRiveFile = async () => {
      try {
        const currentInput = input;

        if (currentInput == null) {
          setResult({
            riveFile: null,
            isLoading: false,
            error: 'No Rive file input provided.',
          });
          return;
        }
        if (typeof currentInput === 'string') {
          if (
            currentInput.startsWith('http://') ||
            currentInput.startsWith('https://')
          ) {
            currentFile = await RiveFileFactory.fromURL(
              currentInput,
              initialReferencedAssets.current
            );
          } else {
            currentFile = await RiveFileFactory.fromResource(
              currentInput,
              initialReferencedAssets.current
            );
          }
        } else if (typeof currentInput === 'number' || 'uri' in currentInput) {
          currentFile = await RiveFileFactory.fromSource(
            currentInput,
            initialReferencedAssets.current
          );
        } else if (currentInput instanceof ArrayBuffer) {
          currentFile = await RiveFileFactory.fromBytes(
            currentInput,
            initialReferencedAssets.current
          );
        }

        setResult({ riveFile: currentFile!, isLoading: false, error: null });
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

    loadRiveFile();

    return () => {
      if (currentFile) {
        currentFile.release();
      }
    };
  }, [input]);

  const { riveFile } = result;
  useEffect(() => {
    if (initialReferencedAssets.current !== referencedAssets) {
      if (riveFile && referencedAssets) {
        riveFile.updateReferencedAssets({ data: referencedAssets });
        initialReferencedAssets.current = referencedAssets;
      }
    }
  }, [referencedAssets, riveFile]);

  if (initialInput.current !== input) {
    console.warn(
      'useRiveFile: Changing input after initial render is not supported.'
    );
  }

  return {
    riveFile: result.riveFile,
    isLoading: result.isLoading,
    error: result.error,
  } as RiveFileHookResult;
}
