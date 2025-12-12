import { useState, useEffect, useMemo, useRef } from 'react';
import { Image } from 'react-native';
import { RiveFileFactory } from '../core/RiveFile';
import { callDispose } from '../core/callDispose';
import type {
  RiveFile,
  ResolvedReferencedAsset,
} from '../specs/RiveFile.nitro';
import type { RiveImage } from '../specs/RiveImage.nitro';
import type {
  ReferencedAsset,
  ReferencedAssets,
  ResolvedReferencedAssets,
} from '../core/ReferencedAssets';

export type { ReferencedAssets, ResolvedReferencedAssets };
export type RiveFileInput = number | { uri: string } | string | ArrayBuffer;

export type UseRiveFileOptions = {
  referencedAssets?: ReferencedAssets;
};

function isRiveImage(value: ReferencedAsset): value is RiveImage {
  return (
    value !== null &&
    typeof value === 'object' &&
    '__type' in value &&
    value.__type === 'HybridObject<RiveImage>'
  );
}

function parsePossibleSources(asset: ReferencedAsset): ResolvedReferencedAsset {
  if (isRiveImage(asset)) {
    return { image: asset };
  }

  const source = asset.source;

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

  const fileName = (source as any).fileName;
  const path = (source as any).path;

  if (typeof source === 'object' && fileName) {
    const result: ResolvedReferencedAsset = { sourceAsset: fileName };

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

  Object.entries(mapping).forEach(([key, asset]) => {
    transformedMapping[key] = parsePossibleSources(asset);
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
        callDispose(currentFile);
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

  return {
    riveFile: result.riveFile,
    isLoading: result.isLoading,
    error: result.error,
  } as RiveFileHookResult;
}
