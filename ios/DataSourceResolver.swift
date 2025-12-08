import Foundation

struct DataSourceResolver {
  static func resolve(from asset: ResolvedReferencedAsset) throws -> DataSource? {
    if let sourceUrl = asset.sourceUrl {
      return try resolveFromUrl(sourceUrl)
    }

    if let sourceAssetId = asset.sourceAssetId {
      return try resolveFromAssetId(sourceAssetId)
    }

    if let sourceAsset = asset.sourceAsset {
      return resolveFromSourceAsset(sourceAsset)
    }

    return nil
  }

  private static func resolveFromUrl(_ urlString: String) throws -> DataSource {
    guard let url = URL(string: urlString) else {
      throw DataLoaderError.invalidURL(urlString)
    }

    if url.isFileURL {
      return .file(url: url)
    }

    if url.scheme == "http" || url.scheme == "https" {
      return .http(url: url)
    }

    throw DataLoaderError.invalidURL(urlString)
  }

  private static func resolveFromAssetId(_ assetId: String) throws -> DataSource {
    guard let url = URL(string: assetId) else {
      throw DataLoaderError.invalidURL(assetId)
    }

    if url.isFileURL {
      return .file(url: url)
    }

    if url.scheme == "http" || url.scheme == "https" {
      return .http(url: url)
    }

    throw DataLoaderError.invalidURL(assetId)
  }

  private static func resolveFromSourceAsset(_ sourceAsset: String) -> DataSource {
    return .bundle(nameWithExtension: sourceAsset)
  }
}
