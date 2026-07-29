import type {
  ResolvedReferencedAsset,
  RiveAssetType,
} from '../specs/RiveFile.nitro';
import type { RiveImage } from '../specs/RiveImage.nitro';
import type { RiveFileSchema } from './TypedRiveFile';

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

/**
 * `referencedAssets` constrained to a generated schema: keys must be asset
 * unique identifiers from the .riv file, and each entry's declared `type`
 * must match the asset's actual kind. `RiveImage` objects are only accepted
 * for image assets. Degrades to the untyped {@link ReferencedAssets} when the
 * schema is not statically known.
 */
export type TypedReferencedAssets<S extends RiveFileSchema> =
  string extends Extract<keyof S['assets'], string>
    ? ReferencedAssets
    : [Extract<keyof S['assets'], string>] extends [never]
      ? // No referenced assets in the file — an empty mapped type would be
        // `{}`, which accepts any object; `never` values reject every entry.
        Record<string, never>
      : {
          [K in Extract<
            keyof S['assets'],
            string
          >]?: S['assets'][K] extends 'image'
            ? (ReferencedAssetSource & { type?: 'image' }) | RiveImage
            : ReferencedAssetSource & {
                type?: S['assets'][K] & RiveAssetType;
              };
        };

/**
 * Resolved (post-`Image.resolveAssetSource`) form of
 * {@link TypedReferencedAssets}, used by the RiveFileFactory methods.
 */
export type TypedResolvedReferencedAssets<S extends RiveFileSchema> =
  string extends Extract<keyof S['assets'], string>
    ? ResolvedReferencedAssets
    : [Extract<keyof S['assets'], string>] extends [never]
      ? Record<string, never>
      : {
          [K in Extract<keyof S['assets'], string>]?: ResolvedReferencedAsset;
        };
