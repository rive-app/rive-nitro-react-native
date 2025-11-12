import NitroModules
import RiveRuntime

final class HybridRiveFileFactory: HybridRiveFileFactorySpec, @unchecked Sendable {
  let assetLoader = ReferencedAssetLoader()

  /// Asynchronously creates a `HybridRiveFileSpec` by performing the following steps:
  /// 1. Executes `check()` to validate or fetch initial data.
  /// 2. Processes the result with `prepare()`.
  /// 3. If a custom asset loader is available, loads the file using `fileWithCustomAssetLoader(prepared, assetLoader)`.
  ///    Otherwise, loads the file using `file(prepared)`.
  /// 4. Handles referenced assets and caches as needed.
  /// - Parameters:
  ///   - check: Closure to validate or fetch initial data.
  ///   - prepare: Closure to process the checked result.
  ///   - fileWithCustomAssetLoader: Closure to load the file with a custom asset loader.
  ///   - file: Closure to load the file without a custom asset loader.
  ///   - referencedAssets: Optional referenced assets.
  /// - Returns: A promise resolving to a `HybridRiveFileSpec`.
  /// - Throws: Runtime errors if any step fails.
  func genericFrom<CheckResult, Prepared>(
    check: @escaping () throws -> CheckResult,
    prepare: @escaping (CheckResult) throws -> Prepared,
    fileWithCustomAssetLoader: @escaping (Prepared, @escaping LoadAsset) throws -> RiveFile,
    file: @escaping (Prepared) throws -> RiveFile,
    referencedAssets: ReferencedAssetsType?
  ) throws -> Promise<(any HybridRiveFileSpec)> {
    return Promise.async {
      do {
        let checked = try check()

        let result = try await withCheckedThrowingContinuation { continuation in
          DispatchQueue.global(qos: .userInitiated).async {
            do {
              let prepared = try prepare(checked)

              let referencedAssetCache = SendableRef(ReferencedAssetCache())
              let factoryCache: SendableRef<RiveFactory?> = .init(nil)
              let customLoader = self.assetLoader.createCustomLoader(
                referencedAssets: referencedAssets, cache: referencedAssetCache,
                factory: factoryCache)

              let riveFile =
                if let customLoader = customLoader {
                  try fileWithCustomAssetLoader(prepared, customLoader)
                } else {
                  try file(prepared)
                }

              let result = (
                file: riveFile, cache: referencedAssetCache.value, factory: factoryCache.value,
                loader: customLoader != nil ? self.assetLoader : nil
              )
              DispatchQueue.main.async {
                continuation.resume(returning: result)
              }
            } catch {
              DispatchQueue.main.async {
                continuation.resume(throwing: error)
              }
            }
          }
        }

        let hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = result.file
        hybridRiveFile.referencedAssetCache = result.cache
        if let factory = result.factory {
          hybridRiveFile.cachedFactory = factory
        }
        hybridRiveFile.assetLoader = result.loader
        return hybridRiveFile
      } catch let error as NSError {
        throw RuntimeError.error(
          withMessage: "Failed to download Rive file: \(error.localizedDescription)")
      } catch {
        throw RuntimeError.error(withMessage: "Unknown error occurred while downloading Rive file")
      }
    }
  }

  // MARK: Public Methods
  func fromURL(url: String, loadCdn: Bool, referencedAssets: ReferencedAssetsType?) throws
    -> Promise<(any HybridRiveFileSpec)>
  {
    return try genericFrom(
      check: {
        guard let url = URL(string: url) else {
          throw RuntimeError.error(withMessage: "Invalid URL: \(url)")
        }
        return url
      },
      prepare: { url in try Data(contentsOf: url) },
      fileWithCustomAssetLoader: { (data, loader) in
        try RiveFile(data: data, loadCdn: loadCdn, customAssetLoader: loader)
      },
      file: { (data) in try RiveFile(data: data, loadCdn: loadCdn) },
      referencedAssets: referencedAssets
    )
  }

  func fromFileURL(fileURL: String, loadCdn: Bool, referencedAssets: ReferencedAssetsType?) throws
    -> Promise<(any HybridRiveFileSpec)>
  {
    return try genericFrom(
      check: {
        guard let url = URL(string: fileURL) else {
          throw RuntimeError.error(withMessage: "Invalid URL: \(fileURL)")
        }
        guard url.isFileURL else {
          throw RuntimeError.error(withMessage: "fromFileURL: URL must be a file URL: \(fileURL)")
        }
        return url
      },
      prepare: { url in try Data(contentsOf: url) },
      fileWithCustomAssetLoader: { (data, loader) in
        try RiveFile(data: data, loadCdn: loadCdn, customAssetLoader: loader)
      },
      file: { (data) in try RiveFile(data: data, loadCdn: loadCdn) },
      referencedAssets: referencedAssets
    )
  }

  func fromResource(resource: String, loadCdn: Bool, referencedAssets: ReferencedAssetsType?) throws
    -> Promise<(any HybridRiveFileSpec)>
  {
    return try genericFrom(
      check: {
        guard Bundle.main.path(forResource: resource, ofType: "riv") != nil else {
          throw RuntimeError.error(withMessage: "Could not find Rive file: \(resource).riv")
        }
        return resource
      },
      prepare: { $0 },
      fileWithCustomAssetLoader: { (resource, loader) in
        try RiveFile(resource: resource, loadCdn: loadCdn, customAssetLoader: loader)
      },
      file: { (resource) in try RiveFile(resource: resource, loadCdn: loadCdn) },
      referencedAssets: referencedAssets
    )
  }

  func fromResource(resource: String, loadCdn: Bool) throws -> Promise<(any HybridRiveFileSpec)> {
    return try fromResource(resource: resource, loadCdn: loadCdn, referencedAssets: nil)
  }

  func fromBytes(bytes: ArrayBufferHolder, loadCdn: Bool, referencedAssets: ReferencedAssetsType?)
    throws -> Promise<
      (any HybridRiveFileSpec)
    >
  {
    return try genericFrom(
      check: { bytes.toData(copyIfNeeded: false) },
      prepare: { $0 },
      fileWithCustomAssetLoader: { (data, loader) in
        try RiveFile(data: data, loadCdn: loadCdn, customAssetLoader: loader)
      },
      file: { (data) in try RiveFile(data: data, loadCdn: loadCdn) },
      referencedAssets: referencedAssets
    )
  }
}
