import NitroModules
import RiveRuntime

struct FileAndCache {
  var file: RiveFile
  var cache: [String: RiveFileAsset]
}

func createAssetFileError(_ assetName: String) -> NitroRiveError {
  return NitroRiveError.fileNotFound(message: "Could not load Rive asset: \(assetName)")
}

final class ReferencedAssetLoader {
  private func handleRiveError(error: Error) {
    RCTLogError("\(error)")
  }

  private func processAssetBytes(
    _ data: Data, asset: RiveFileAsset, factory: RiveFactory, completion: @escaping () -> Void
  ) {
    if data.isEmpty == true {
      completion()
      return
    }
    DispatchQueue.global(qos: .background).async {
      switch asset {
      case let imageAsset as RiveImageAsset:
        let decodedImage = factory.decodeImage(data)
        DispatchQueue.main.async {
          imageAsset.renderImage(decodedImage)
          completion()
        }
      case let fontAsset as RiveFontAsset:
        let decodedFont = factory.decodeFont(data)
        DispatchQueue.main.async {
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
        DispatchQueue.main.async {
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

  private func handlePreloadedImage(
    _ image: any HybridRiveImageSpec, asset: RiveFileAsset, completion: @escaping () -> Void
  ) {
    guard let imageAsset = asset as? RiveImageAsset,
      let hybridImage = image as? HybridRiveImage
    else {
      completion()
      return
    }

    imageAsset.renderImage(hybridImage.renderImage)
    completion()
  }

  private func loadAssetInternal(
    source: ResolvedReferencedAsset, asset: RiveFileAsset, factory: RiveFactory,
    completion: @escaping () -> Void
  ) {
    if let preloadedImage = source.image {
      handlePreloadedImage(preloadedImage, asset: asset, completion: completion)
      return
    }

    let dataSource: DataSource
    do {
      guard let resolved = try DataSourceResolver.resolve(from: source) else {
        completion()
        return
      }
      dataSource = resolved
    } catch {
      handleRiveError(error: error)
      completion()
      return
    }

    Task {
      do {
        let data: Data

        // Check cache first for URL assets
        if case .http(let url) = dataSource {
          if let cachedData = URLAssetCache.getCachedData(for: url.absoluteString) {
            data = cachedData
          } else {
            // Download and cache
            let downloadedData = try await dataSource.createLoader().load(from: dataSource)
            URLAssetCache.saveToCache(downloadedData, for: url.absoluteString)
            data = downloadedData
          }
        } else {
          // For non-URL assets, use the loader directly
          data = try await dataSource.createLoader().load(from: dataSource)
        }

        await MainActor.run {
          self.processAssetBytes(data, asset: asset, factory: factory, completion: completion)
        }
      } catch {
        await MainActor.run {
          self.handleRiveError(error: error)
          completion()
        }
      }
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
    -> LoadAsset?
  {
    guard let referencedAssets = referencedAssets, let assetsData = referencedAssets.data
    else {
      return nil
    }
    return { (asset: RiveFileAsset, _: Data, factory: RiveFactory) -> Bool in
      cache.value[asset.uniqueName()] = asset
      cache.value[asset.name()] = asset
      factoryOut.value = factory

      // Look up asset data by unique name or name
      var key = (asset.uniqueName() as NSString).deletingPathExtension
      var assetData = assetsData[key]

      if assetData == nil {
        key = asset.name()
        assetData = assetsData[key]
      }

      if assetData == nil && !asset.cdnUuid().isEmpty {
        assetData = ResolvedReferencedAsset(sourceUrl: "\(asset.cdnBaseUrl())/\(asset.cdnUuid())", sourceAsset: nil, sourceAssetId: nil, path: nil, image: nil)
      }

      guard let assetData = assetData else {
        return false
      }

      self.loadAssetInternal(
        source: assetData, asset: asset, factory: factory,
        completion: {
          withExtendedLifetime(fileRef) {}
        })

      return true
    }
  }
}
