import NitroModules
import RiveRuntime

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
  private func handleRiveError(error: Error) {
    // TODO allow user to specify onError callback
    RCTLogError("\(error)")
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

    let queue = URLSession.shared
    guard let requestUrl = URL(string: url) else {
      handleInvalidUrlError(url: url)
      onError()
      return
    }

    let request = URLRequest(url: requestUrl)
    let task = queue.dataTask(with: request) { [weak self] data, _, error in
      if error != nil {
        self?.handleInvalidUrlError(url: url)
        onError()
      } else if let data = data {
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
        self?.processAssetBytes(data, asset: asset, factory: factory, completion: completion)
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
    return { (asset: RiveFileAsset, _: Data, factory: RiveFactory) -> Bool in
      let assetByUniqueName = referencedAssets[asset.uniqueName()]
      guard let assetData = assetByUniqueName ?? referencedAssets[asset.name()] else {
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
