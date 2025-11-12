import { Image } from 'react-native';
import { RiveFileFactory } from '../core/RiveFile';
import type { RiveFile } from '../specs/RiveFile.nitro';
import type { ResolvedReferencedAsset } from '../specs/RiveFile.nitro';
import type { RiveFileInput, ReferencedAssets } from '../hooks/useRiveFile';

export type ReferencedAsset = { source: number | { uri: string } };

export type ResolvedReferencedAssets = {
  [assetName: string]: ResolvedReferencedAsset;
};

export function parsePossibleSources(
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

export function resolveReferencedAssets(
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

export async function loadRiveFile(
  input: RiveFileInput,
  referencedAssets?: ResolvedReferencedAssets
): Promise<RiveFile> {
  if (typeof input === 'string') {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return await RiveFileFactory.fromURL(input, referencedAssets);
    } else {
      return await RiveFileFactory.fromResource(input, referencedAssets);
    }
  } else if (typeof input === 'number' || 'uri' in input) {
    return await RiveFileFactory.fromSource(input, referencedAssets);
  } else if (input instanceof ArrayBuffer) {
    return await RiveFileFactory.fromBytes(input, referencedAssets);
  }

  throw new Error('Invalid RiveFileInput type');
}
