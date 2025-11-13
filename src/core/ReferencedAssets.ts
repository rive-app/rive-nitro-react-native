import type { ResolvedReferencedAsset } from '../specs/RiveFile.nitro';

export type ReferencedAsset = { source: number | { uri: string } };

export interface ReferencedAssets {
  [assetName: string]: ReferencedAsset;
}

export type ResolvedReferencedAssets = {
  [assetName: string]: ResolvedReferencedAsset;
};
