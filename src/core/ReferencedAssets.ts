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

type SchemaAssetKeys<S extends RiveFileSchema> = Extract<
  keyof S['assets'],
  string
>;

/** Error-message literal: a `never` value would reject entries without saying why. */
type NoReferencedAssets = Record<
  string,
  'this .riv file has no referenced (out-of-band) assets'
>;

/** Untyped when the schema is unknown, rejecting when the file has no referenced assets. */
type ForSchemaAssets<S extends RiveFileSchema, Untyped, Typed> =
  string extends SchemaAssetKeys<S>
    ? Untyped
    : [SchemaAssetKeys<S>] extends [never]
      ? NoReferencedAssets
      : Typed;

/**
 * `referencedAssets` constrained to a generated schema: keys must be asset
 * unique identifiers from the .riv file, and each entry's declared `type`
 * must match the asset's actual kind. `RiveImage` objects are only accepted
 * for image assets. Degrades to the untyped {@link ReferencedAssets} when the
 * schema is not statically known.
 */
export type TypedReferencedAssets<S extends RiveFileSchema> = ForSchemaAssets<
  S,
  ReferencedAssets,
  {
    [K in SchemaAssetKeys<S>]?: S['assets'][K] extends 'image'
      ? (ReferencedAssetSource & { type?: 'image' }) | RiveImage
      : ReferencedAssetSource & { type?: S['assets'][K] & RiveAssetType };
  }
>;

/**
 * Resolved (post-`Image.resolveAssetSource`) form of
 * {@link TypedReferencedAssets}, used by the RiveFileFactory methods.
 */
export type TypedResolvedReferencedAssets<S extends RiveFileSchema> =
  ForSchemaAssets<
    S,
    ResolvedReferencedAssets,
    {
      [K in SchemaAssetKeys<S>]?: S['assets'][K] extends 'image'
        ? ResolvedReferencedAsset & { type?: 'image' }
        : Omit<ResolvedReferencedAsset, 'image' | 'type'> & {
            type?: S['assets'][K] & RiveAssetType;
          };
    }
  >;
