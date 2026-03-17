import type { ResolvedReferencedAsset, RiveAssetType } from '../specs/RiveFile.nitro';
import type { RiveImage } from '../specs/RiveImage.nitro';

export type ReferencedAssetSource = {
  source: number | { uri: string };
  /**
   * Explicitly declares the type of this asset.
   * **Recommended** — the new Rive runtime does not expose asset type at load
   * time, so omitting this will trigger a deprecation warning and fall back to
   * extension / magic-byte inference.
   */
  type?: RiveAssetType;
};

export type ReferencedAsset = ReferencedAssetSource | RiveImage;

export interface ReferencedAssets {
  [assetName: string]: ReferencedAsset;
}

export type ResolvedReferencedAssets = {
  [assetName: string]: ResolvedReferencedAsset;
};
