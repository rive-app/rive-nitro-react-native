import NitroModules
import RiveRuntime

final class HybridRiveFileFactory: HybridRiveFileFactorySpec {
  let assetLoader = ReferencedAssetLoader()

  private func buildRiveFile(data: Data, loadCdn: Bool, referencedAssets: ReferencedAssetsType?) throws -> (file: RiveFile, cache: ReferencedAssetCache, loader: ReferencedAssetLoader?)  {
    var referencedAssetCache = SendableRef(ReferencedAssetCache())
    let customLoader = assetLoader.createCustomLoader(referencedAssets: referencedAssets, cache: referencedAssetCache)

    let riveFile = if let customLoader = customLoader {
      try RiveFile(data: data, loadCdn: loadCdn, customAssetLoader: customLoader)
    } else {
      try RiveFile(data: data, loadCdn: loadCdn)
    }

    return (file: riveFile, cache: referencedAssetCache.value, loader: customLoader != nil ? assetLoader : nil)
  }

  // MARK: Public Methods
  func fromURL(url: String, loadCdn: Bool, referencedAssets: ReferencedAssetsType?) throws -> Promise<(any HybridRiveFileSpec)> {
    return Promise.async {
      do {
        guard let url = URL(string: url) else {
          throw RuntimeError.error(withMessage: "Invalid URL: \(url)")
        }

        let result = try await withCheckedThrowingContinuation { continuation in
          DispatchQueue.global(qos: .userInitiated).async {
            do {
              let riveData = try Data(contentsOf: url)
              let result = try self.buildRiveFile(data: riveData, loadCdn: loadCdn, referencedAssets: referencedAssets)
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

  func fromFileURL(fileURL: String, loadCdn: Bool, referencedAssets: ReferencedAssetsType?) throws -> Promise<(any HybridRiveFileSpec)> {
    guard let url = URL(string: fileURL) else {
      throw RuntimeError.error(withMessage: "fromFileURL: Invalid URL: \(fileURL)")
    }

    guard url.isFileURL else {
      throw RuntimeError.error(withMessage: "fromFileURL: URL must be a file URL: \(fileURL)")
    }

    return Promise.async {
      do {
        let result = try await withCheckedThrowingContinuation { continuation in
          DispatchQueue.global(qos: .userInitiated).async {
            do {
              let data = try Data(contentsOf: url)
              let result = try self.buildRiveFile(data: data, loadCdn: loadCdn, referencedAssets: referencedAssets)
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
        hybridRiveFile.assetLoader = result.loader
        return hybridRiveFile
      } catch let error as NSError {
        throw RuntimeError.error(
          withMessage: "Failed to load Rive file: \(error.localizedDescription)")
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
        let assetLoader = self.assetLoader
        let referencedAssetCache = SendableRef(ReferencedAssetCache())
        let riveFile = try await withCheckedThrowingContinuation { continuation in
          DispatchQueue.global(qos: .userInitiated).async {
            do {
              let riveFile =
                if let customLoader = assetLoader.createCustomLoader(referencedAssets: referencedAssets, cache: referencedAssetCache) {
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
        if referencedAssets != nil {
          hybridRiveFile.referencedAssetCache = referencedAssetCache.value
          hybridRiveFile.assetLoader = assetLoader
        }
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

  func fromBytes(bytes: ArrayBufferHolder, loadCdn: Bool, referencedAssets: ReferencedAssetsType?) throws -> Promise<
    (any HybridRiveFileSpec)
  > {
    let data = bytes.toData(copyIfNeeded: false)
    return Promise.async {
      do {
        let result = try await withCheckedThrowingContinuation { continuation in
          DispatchQueue.global(qos: .userInitiated).async {
            do {
              let result = try self.buildRiveFile(data: data, loadCdn: loadCdn, referencedAssets: referencedAssets)
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
        hybridRiveFile.assetLoader = result.loader
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
