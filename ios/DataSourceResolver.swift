import Foundation

struct DataSourceResolver {
  static func resolve(from asset: ResolvedReferencedAsset) -> DataSource? {
    if let sourceUrl = asset.sourceUrl {
      return resolveFromUrl(sourceUrl)
    }

    if let sourceAssetId = asset.sourceAssetId {
      return resolveFromAssetId(sourceAssetId)
    }

    if let sourceAsset = asset.sourceAsset {
      return resolveFromSourceAsset(sourceAsset)
    }

    return nil
  }

  private static func resolveFromUrl(_ urlString: String) -> DataSource? {
    guard let url = URL(string: urlString) else {
      return nil
    }

    if url.isFileURL {
      return .file(url: url)
    }

    if url.scheme == "http" || url.scheme == "https" {
      return .http(url: url)
    }

    return nil
  }

  private static func resolveFromAssetId(_ assetId: String) -> DataSource? {
    guard let url = URL(string: assetId) else {
      return nil
    }

    if url.isFileURL {
      return .file(url: url)
    }

    if url.scheme == "http" || url.scheme == "https" {
      return .http(url: url)
    }

    return nil
  }

  private static func resolveFromSourceAsset(_ sourceAsset: String) -> DataSource? {
    let name = (sourceAsset as NSString).deletingPathExtension
    let ext = (sourceAsset as NSString).pathExtension
    let fileExtension = ext.isEmpty ? nil : ext
    return .bundle(resource: name, extension: fileExtension)
  }
}
