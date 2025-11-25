import type { ResolvedReferencedAsset } from '../specs/RiveFile.nitro';
import type { RiveImage } from '../specs/RiveImage.nitro';

export type ReferencedAssetSource = { source: number | { uri: string } };

export type ReferencedAsset = ReferencedAssetSource | RiveImage;

export interface ReferencedAssets {
  [assetName: string]: ReferencedAsset;
}

export type ResolvedReferencedAssets = {
  [assetName: string]: ResolvedReferencedAsset;
};
