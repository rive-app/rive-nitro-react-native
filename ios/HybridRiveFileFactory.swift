import NitroModules
import RiveRuntime

final class HybridRiveFileFactory: HybridRiveFileFactorySpec {
  private func buildRiveFile(data: Data, loadCdn: Bool, referencedAssets: ReferencedAssetsType?) throws -> (file: RiveFile, cache: ReferencedAssetCache, loader: ReferencedAssetLoader?)  {
    var referencedAssetCache = Ref(ReferencedAssetCache())
    let assetLoader = ReferencedAssetLoader()
    let customLoader = assetLoader.createCustomLoader(referencedAssets: referencedAssets, cache: referencedAssetCache)

    let riveFile = if let customLoader = customLoader {
      try RiveFile(data: data, loadCdn: loadCdn, customAssetLoader: customLoader)
    } else {
      try RiveFile(data: data, loadCdn: loadCdn)
    }

    return (file: riveFile, cache: referencedAssetCache.value, loader: customLoader != nil ? assetLoader : nil)
  }

  // MARK: Public Methods
  func fromURL(url: String, loadCdn: Bool) throws -> Promise<(any HybridRiveFileSpec)> {
    // TODO: should we make use of the underlying Rive iOS URL asset loading instead
    return Promise.async {
      do {
        guard let url = URL(string: url) else {
          throw RuntimeError.error(withMessage: "Invalid URL: \(url)")
        }

        let riveFile = try await withCheckedThrowingContinuation { continuation in
          DispatchQueue.global(qos: .userInitiated).async {
            do {
              let riveData = try Data(contentsOf: url)
              let riveFile = try RiveFile(data: riveData, loadCdn: true)
              DispatchQueue.main.async {
                continuation.resume(returning: riveFile)
              }
            } catch {
              DispatchQueue.main.async {
                continuation.resume(throwing: error)
              }
            }
          }
        }

        let hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = riveFile
        return hybridRiveFile
      } catch let error as NSError {
        throw RuntimeError.error(
          withMessage: "Failed to download Rive file: \(error.localizedDescription)")
      } catch {
        throw RuntimeError.error(withMessage: "Unknown error occurred while downloading Rive file")
      }
    }
  }

  func fromFileURL(fileURL: String, loadCdn: Bool) throws -> Promise<(any HybridRiveFileSpec)> {
    guard let url = URL(string: fileURL) else {
      throw RuntimeError.error(withMessage: "fromFileURL: Invalid URL: \(fileURL)")
    }

    guard url.isFileURL else {
      throw RuntimeError.error(withMessage: "fromFileURL: URL must be a file URL: \(fileURL)")
    }

    return Promise.async {
      do {
        let riveFile = try await withCheckedThrowingContinuation { continuation in
          DispatchQueue.global(qos: .userInitiated).async {
            do {
              let data = try Data(contentsOf: url)

        let hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = riveFile.file
        hybridRiveFile.referencedAssetCache = riveFile.cache
        hybridRiveFile.assetLoader = riveFile.loader
        return hybridRiveFile
      } catch let error as NSError {
        throw RuntimeError.error(withMessage: "Failed to load Rive file: \(error.localizedDescription)")
      } catch {
        throw RuntimeError.error(withMessage: "Unknown error occurred while loading Rive file")
      }
    }
  }

  func fromResource(resource: String, loadCdn: Bool, referencedAssets: ReferencedAssetsType?) throws -> Promise<(any HybridRiveFileSpec)> {
    guard let _ = Bundle.main.path(forResource: resource, ofType: "riv") else {
      throw RuntimeError.error(withMessage: "Could not find Rive file: \(resource).riv")
    }

    return Promise.async {
      do {

        let riveFile = try await withCheckedThrowingContinuation { continuation in
          DispatchQueue.global(qos: .userInitiated).async {
            do {
              var referencedAssetCache = Ref(ReferencedAssetCache())
              let riveFile =
              if let customLoader = self.assetLoader.createCustomLoader(referencedAssets: referencedAssets, cache: referencedAssetCache) {
                  try RiveFile(resource: resource, loadCdn: loadCdn, customAssetLoader: customLoader)
                } else {
                  try RiveFile(resource: resource, loadCdn: loadCdn)
                }
              DispatchQueue.main.async {
                continuation.resume(returning: riveFile)
              }
            } catch {
              DispatchQueue.main.async {
                continuation.resume(throwing: error)
              }
            }
          }
        }

        let hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = riveFile
        return hybridRiveFile
      } catch let error as NSError {
        throw RuntimeError.error(
          withMessage: "Failed to load Rive file: \(error.localizedDescription)")
      } catch {
        throw RuntimeError.error(withMessage: "Unknown error occurred while loading Rive file")
      }
    }
  }

  func fromResource(resource: String, loadCdn: Bool) throws -> Promise<(any HybridRiveFileSpec)> {
    guard Bundle.main.path(forResource: resource, ofType: "riv") != nil else {
      throw RuntimeError.error(withMessage: "Could not find Rive file: \(resource).riv")
    }

    return Promise.async {
      do {
        let riveFile = try await withCheckedThrowingContinuation { continuation in
          DispatchQueue.global(qos: .userInitiated).async {
            do {
              let riveFile = try RiveFile(resource: resource, loadCdn: loadCdn)
              DispatchQueue.main.async {
                continuation.resume(returning: riveFile)
              }
            } catch {
              DispatchQueue.main.async {
                continuation.resume(throwing: error)
              }
            }
          }
        }

        let hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = riveFile
        return hybridRiveFile
      } catch let error as NSError {
        throw RuntimeError.error(
          withMessage: "Failed to load Rive file: \(error.localizedDescription)")
      } catch {
        throw RuntimeError.error(withMessage: "Unknown error occurred while loading Rive file")
      }
    }
  }

  func fromBytes(bytes: ArrayBufferHolder, loadCdn: Bool) throws -> Promise<
    (any HybridRiveFileSpec)
  > {
    let data = bytes.toData(copyIfNeeded: false)
    return Promise.async {
      do {
        let riveFile = try await withCheckedThrowingContinuation { continuation in
          DispatchQueue.global(qos: .userInitiated).async {
            do {
              var referencedAssetCache = Ref(ReferencedAssetCache())
              let riveFile =
              if let customLoader = self.assetLoader.createCustomLoader(referencedAssets: referencedAssets, cache: referencedAssetCache) {
                  try RiveFile(data: data, loadCdn: loadCdn, customAssetLoader: customLoader)
                } else {
                  try RiveFile(data: data, loadCdn: loadCdn)
                }

              DispatchQueue.main.async {
                continuation.resume(returning: riveFile)
              }
            } catch {
              DispatchQueue.main.async {
                continuation.resume(throwing: error)
              }
            }
          }
        }

        let hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = riveFile
        return hybridRiveFile
      } catch let error as NSError {
        throw RuntimeError.error(
          withMessage: "Failed to load Rive file from bytes: \(error.localizedDescription)")
      } catch {
        throw RuntimeError.error(
          withMessage: "Unknown error occurred while loading Rive file from bytes")
      }
    }
  }
}
