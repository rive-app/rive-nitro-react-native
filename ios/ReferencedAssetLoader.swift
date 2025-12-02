import NitroModules
import RiveRuntime
import Foundation

struct FileAndCache {
  var file: RiveFile
  var cache: [String: RiveFileAsset]
}

private func isValidUrl(_ url: String) -> Bool {
  if let url = URL(string: url) {
    return url.scheme == "file" || url.scheme == "http" || url.scheme == "https"
  } else {
    return false
  }
}

func createIncorrectRiveURL(_ url: String) -> NSError {
  return NSError(
    domain: RiveErrorDomain, code: 900,
    userInfo: [
      NSLocalizedDescriptionKey: "Unable to download Rive file from: \(url)",
      "name": "IncorrectRiveFileURL"
    ])
}

func createAssetFileError(_ assetName: String) -> NitroRiveError {
  return NitroRiveError.fileNotFound(message: "Could not load Rive asset: \(assetName)")
}

final class ReferencedAssetLoader {
  private let cacheQueue = DispatchQueue(label: "com.rive.assetCache", attributes: .concurrent)

  private func handleRiveError(error: Error) {
    // TODO allow user to specify onError callback
    RCTLogError("\(error)")
  }

  private func logDebug(_ message: String) {
    #if DEBUG
    print("[ReferencedAssetLoader] \(message)")
    #endif
  }

  /**
   * Get the cache directory for storing CDN assets
   */
  private func getCacheDir() -> URL {
    let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    let riveCacheDir = cacheDir.appendingPathComponent("rive_assets", isDirectory: true)

    // Create directory if it doesn't exist
    if !FileManager.default.fileExists(atPath: riveCacheDir.path) {
      try? FileManager.default.createDirectory(at: riveCacheDir, withIntermediateDirectories: true, attributes: nil)
    }

    return riveCacheDir
  }

  /**
   * Generate a cache key from a URL or UUID
   */
  private func generateCacheKey(_ urlOrUuid: String) -> String {
    // Use a simple hash-based approach that doesn't require CommonCrypto
    // This creates a deterministic cache key from the URL/UUID
    let hash = urlOrUuid.hashValue
    // Convert to positive hex string
    let hashString = String(format: "%x", abs(hash))
    // Use first 32 characters (MD5-like length) or pad if needed
    return String(hashString.prefix(32)).padding(toLength: 32, withPad: "0", startingAt: 0)
  }

  /**
   * Get cached file path for a URL/UUID
   */
  private func getCachedFilePath(_ urlOrUuid: String) -> URL {
    let cacheKey = generateCacheKey(urlOrUuid)
    return getCacheDir().appendingPathComponent(cacheKey)
  }

  /**
   * Check if a cached file exists and is valid
   */
  private func getCachedAsset(_ urlOrUuid: String) -> Data? {
    return cacheQueue.sync {
      let cacheFile = getCachedFilePath(urlOrUuid)
      guard FileManager.default.fileExists(atPath: cacheFile.path) else {
        logDebug("Cache miss for: \(urlOrUuid)")
        return nil
      }

      do {
        let data = try Data(contentsOf: cacheFile)
        if data.count > 0 {
          logDebug("Cache hit for: \(urlOrUuid)")
          return data
        }
      } catch {
        logDebug("Error reading cache for \(urlOrUuid): \(error.localizedDescription)")
      }

      return nil
    }
  }

  /**
   * Save asset data to cache
   */
  private func saveToCache(_ urlOrUuid: String, data: Data) {
    cacheQueue.async(flags: .barrier) {
      let cacheFile = self.getCachedFilePath(urlOrUuid)
      do {
        try data.write(to: cacheFile)
        self.logDebug("Saved to cache: \(urlOrUuid) (\(data.count) bytes)")
      } catch {
        self.logDebug("Error saving cache for \(urlOrUuid): \(error.localizedDescription)")
      }
    }
  }

  private func handleInvalidUrlError(url: String) {
    handleRiveError(error: createIncorrectRiveURL(url))
  }

  private func downloadUrlAsset(
    url: String, listener: @escaping (Data) -> Void, onError: @escaping () -> Void
  ) {

    guard isValidUrl(url) else {
      handleInvalidUrlError(url: url)
      onError()
      return
    }

    if let fileUrl = URL(string: url), fileUrl.scheme == "file" {
      do {
        let data = try Data(contentsOf: fileUrl)
        listener(data)
      } catch {
        handleInvalidUrlError(url: url)
        onError()
      }
      return
    }

    // Check cache first for HTTP/HTTPS URLs
    if let cachedData = getCachedAsset(url) {
      listener(cachedData)
      return
    }

    let queue = URLSession.shared
    guard let requestUrl = URL(string: url) else {
      handleInvalidUrlError(url: url)
      onError()
      return
    }

    var request = URLRequest(url: requestUrl)
    request.cachePolicy = .returnCacheDataElseLoad

    let task = queue.dataTask(with: request) { [weak self] data, response, error in
      guard let self = self else {
        onError()
        return
      }

      if let error = error {
        self.handleInvalidUrlError(url: url)
        onError()
      } else if let data = data {
        // Save to cache
        self.saveToCache(url, data: data)

        listener(data)
      } else {
        onError()
      }
    }

    task.resume()
  }

  private func processAssetBytes(
    _ data: Data, asset: RiveFileAsset, factory: RiveFactory, completion: @escaping () -> Void
  ) {

    if data.isEmpty == true {
      completion()
      return
    }

    DispatchQueue.global(qos: .background).async { [weak self] in
      guard let self = self else {
        DispatchQueue.main.async {
          completion()
        }
        return
      }

      switch asset {
      case let imageAsset as RiveImageAsset:
        let decodedImage = factory.decodeImage(data)
        DispatchQueue.main.async { [weak self] in
          imageAsset.renderImage(decodedImage)
          completion()
        }
      case let fontAsset as RiveFontAsset:
        let decodedFont = factory.decodeFont(data)
        DispatchQueue.main.async { [weak self] in
          fontAsset.font(decodedFont)
          completion()
        }
      case let audioAsset as RiveAudioAsset:
        guard let decodedAudio = factory.decodeAudio(data) else {
          DispatchQueue.main.async {
            completion()
          }
          return
        }
        DispatchQueue.main.async { [weak self] in
          audioAsset.audio(decodedAudio)
          completion()
        }
      default:
        DispatchQueue.main.async {
          completion()
        }
      }
    }
  }

  private func handleSourceAssetId(
    _ sourceAssetId: String, asset: RiveFileAsset, factory: RiveFactory,
    completion: @escaping () -> Void
  ) {
    guard URL(string: sourceAssetId) != nil else {
      completion()
      return
    }

    downloadUrlAsset(
      url: sourceAssetId,
      listener: { [weak self] data in
        self?.processAssetBytes(data, asset: asset, factory: factory, completion: completion)
      }, onError: completion)
  }

  private func handleSourceUrl(
    _ sourceUrl: String, asset: RiveFileAsset, factory: RiveFactory,
    completion: @escaping () -> Void
  ) {

    downloadUrlAsset(
      url: sourceUrl,
      listener: { [weak self] data in
        self.processAssetBytes(data, asset: asset, factory: factory, completion: completion)
      }, onError: completion)
  }

  private func splitFileNameAndExtension(fileName: String) -> (name: String?, ext: String?)? {
    let components = fileName.split(separator: ".")
    let name = (fileName as NSString).deletingPathExtension
    let fileExtension = (fileName as NSString).pathExtension
    guard components.count == 2 else { return nil }
    return (name: name, ext: fileExtension)
  }

  private func loadResourceAsset(
    sourceAsset: String, path: String?, listener: @escaping (Data) -> Void,
    onError: @escaping () -> Void
  ) {
    guard let splitSourceAssetName = splitFileNameAndExtension(fileName: sourceAsset),
      let name = splitSourceAssetName.name,
      let ext = splitSourceAssetName.ext
    else {
      handleRiveError(error: createAssetFileError(sourceAsset))
      onError()
      return
    }

    guard let folderUrl = Bundle.main.url(forResource: name, withExtension: ext) else {
      handleRiveError(error: createAssetFileError(sourceAsset))
      onError()
      return
    }

    DispatchQueue.global(qos: .background).async { [weak self] in
      do {
        let fileData = try Data(contentsOf: folderUrl)
        DispatchQueue.main.async {
          listener(fileData)
        }
      } catch {
        DispatchQueue.main.async {
          self?.handleRiveError(error: createAssetFileError(sourceAsset))
          onError()
        }
      }
    }
  }

  private func handleSourceAsset(
    _ sourceAsset: String, path: String?, asset: RiveFileAsset, factory: RiveFactory,
    completion: @escaping () -> Void
  ) {
    loadResourceAsset(
      sourceAsset: sourceAsset, path: path,
      listener: { [weak self] data in
        self?.processAssetBytes(data, asset: asset, factory: factory, completion: completion)
      }, onError: completion)
  }

  private func loadAssetInternal(
    source: ResolvedReferencedAsset, asset: RiveFileAsset, factory: RiveFactory,
    completion: @escaping () -> Void
  ) {

    let sourceAssetId = source.sourceAssetId
    let sourceUrl = source.sourceUrl
    let sourceAsset = source.sourceAsset

    if let sourceAssetId = sourceAssetId {
      handleSourceAssetId(sourceAssetId, asset: asset, factory: factory, completion: completion)
    } else if let sourceUrl = sourceUrl {
      handleSourceUrl(sourceUrl, asset: asset, factory: factory, completion: completion)
    } else if let sourceAsset = sourceAsset {
      handleSourceAsset(
        sourceAsset, path: source.path, asset: asset, factory: factory, completion: completion)
    } else {
      completion()
    }
  }

  func loadAsset(
    source: ResolvedReferencedAsset, asset: RiveFileAsset, factory: RiveFactory,
    completion: @escaping () -> Void
  ) {
    loadAssetInternal(source: source, asset: asset, factory: factory, completion: completion)
  }

  func createCustomLoader(
    referencedAssets: ReferencedAssetsType?, cache: SendableRef<ReferencedAssetCache>,
    factory factoryOut: SendableRef<RiveFactory?>,
    fileRef: SendableRef<RiveFile?>
  )
    -> LoadAsset? {
    guard let referencedAssets = referencedAssets, let referencedAssets = referencedAssets.data
    else {
      return nil
    }

    return { [weak self] (asset: RiveFileAsset, data: Data, factory: RiveFactory) -> Bool in
      // Check for CDN URL/UUID first (only if both are non-empty)
      let cdnUuid = asset.cdnUuid()
      let cdnBaseUrl = asset.cdnBaseUrl()

      if !cdnUuid.isEmpty && !cdnBaseUrl.isEmpty {
        let cdnUrl = "\(cdnBaseUrl)/\(cdnUuid)"
        self.logDebug("Loading CDN asset from UUID: \(cdnUuid)")
        let cached = self.getCachedAsset(cdnUrl)
        if let cachedData = cached {
          // Use cached version
          DispatchQueue.global(qos: .background).async {
            self.processAssetBytes(cachedData, asset: asset, factory: factory, completion: {})
          }
          cache.value[asset.uniqueName()] = asset
          cache.value[asset.name()] = asset
          factoryOut.value = factory
          return true
        } else {
          // Download and cache
          cache.value[asset.uniqueName()] = asset
          cache.value[asset.name()] = asset
          factoryOut.value = factory
          self.handleSourceUrl(cdnUrl, asset: asset, factory: factory, completion: {})
          return true
        }
      }

      let assetByUniqueName = referencedAssets[asset.uniqueName()]
      guard let assetData = assetByUniqueName ?? referencedAssets[asset.name()] else {
        cache.value[asset.uniqueName()] = asset
        cache.value[asset.name()] = asset
        factoryOut.value = factory
        return false
      }

      cache.value[asset.uniqueName()] = asset
      factoryOut.value = factory

      self.loadAssetInternal(source: assetData, asset: asset, factory: factory, completion: {
        withExtendedLifetime(fileRef) {}
      })

      return true
    }
  }
}
