import Foundation
import CryptoKit

enum URLAssetCache {
  private static let cacheDirName = "rive_url_assets"

  private static func getCacheDirectory() -> URL? {
    guard let cacheDir = FileManager.default.urls(
      for: .cachesDirectory,
      in: .userDomainMask
    ).first else {
      return nil
    }
    let riveCacheDir = cacheDir.appendingPathComponent(cacheDirName)

    // Create directory if it doesn't exist
    try? FileManager.default.createDirectory(
      at: riveCacheDir,
      withIntermediateDirectories: true,
      attributes: nil
    )

    return riveCacheDir
  }

  private static func urlToCacheKey(_ url: String) -> String {
    let data = Data(url.utf8)
    let hash = SHA256.hash(data: data)
    return hash.compactMap { String(format: "%02x", $0) }.joined()
  }

  private static func getCacheFileURL(for url: String) -> URL? {
    guard let cacheDir = getCacheDirectory() else { return nil }
    let cacheKey = urlToCacheKey(url)
    return cacheDir.appendingPathComponent(cacheKey)
  }

  static func getCachedData(for url: String) -> Data? {
    guard let cacheFileURL = getCacheFileURL(for: url) else { return nil }

    do {
      let data = try Data(contentsOf: cacheFileURL)
      return data.isEmpty ? nil : data
    } catch {
      return nil
    }
  }

  static func saveToCache(_ data: Data, for url: String) {
    guard let cacheFileURL = getCacheFileURL(for: url) else { return }

    do {
      try data.write(to: cacheFileURL)
    } catch {
      // Silently fail - caching is best effort
    }
  }

  static func clearCache() {
    guard let cacheDir = getCacheDirectory() else { return }

    do {
      let files = try FileManager.default.contentsOfDirectory(at: cacheDir, includingPropertiesForKeys: nil)
      for file in files {
        try? FileManager.default.removeItem(at: file)
      }
    } catch {
      // Silently fail
    }
  }
}
