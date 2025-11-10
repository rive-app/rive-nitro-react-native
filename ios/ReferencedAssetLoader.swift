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
      "name": "IncorrectRiveFileURL",
    ])
}

func createAssetFileError(_ assetName: String) -> NSError {
  return NSError(
    domain: RiveErrorDomain, code: 801,
    userInfo: [
      NSLocalizedDescriptionKey: "Could not load Rive asset: \(assetName)", "name": "FileNotFound",
    ])
}

final class ReferencedAssetLoader {
  private func handleRiveError(error: NSError) {
    // TODO allow user to specify onError callback
    RCTLogError(error.localizedDescription)
  }

  private func handleInvalidUrlError(url: String) {
    handleRiveError(error: createIncorrectRiveURL(url))
  }

  private func downloadUrlAsset(url: String, listener: @escaping (Data) -> Void) {
    guard isValidUrl(url) else {
      handleInvalidUrlError(url: url)
      return
    }
    if let fileUrl = URL(string: url), fileUrl.scheme == "file" {
      do {
        let data = try Data(contentsOf: fileUrl)
        listener(data)
      } catch {
        handleInvalidUrlError(url: url)
      }
      return
    }

    let queue = URLSession.shared
    guard let requestUrl = URL(string: url) else {
      handleInvalidUrlError(url: url)
      return
    }

    let request = URLRequest(url: requestUrl)
    let task = queue.dataTask(with: request) { [weak self] data, response, error in
      if error != nil {
        self?.handleInvalidUrlError(url: url)
      } else if let data = data {
        listener(data)
      }
    }

    task.resume()
  }

  private func processAssetBytes(_ data: Data, asset: RiveFileAsset, factory: RiveFactory) {
    if data.isEmpty == true {
      return
    }
    DispatchQueue.global(qos: .background).async {
      switch asset {
      case let imageAsset as RiveImageAsset:
        let decodedImage = factory.decodeImage(data)
        DispatchQueue.main.async {
          imageAsset.renderImage(decodedImage)
        }
      case let fontAsset as RiveFontAsset:
        let decodedFont = factory.decodeFont(data)
        DispatchQueue.main.async {
          fontAsset.font(decodedFont)
        }
      case let audioAsset as RiveAudioAsset:
        guard let decodedAudio = factory.decodeAudio(data) else { return }
        DispatchQueue.main.async {
          audioAsset.audio(decodedAudio)
        }
      default:
        break
      }
    }
  }

  private func handleSourceAssetId(
    _ sourceAssetId: String, asset: RiveFileAsset, factory: RiveFactory
  ) {
    guard URL(string: sourceAssetId) != nil else {
      return
    }

    downloadUrlAsset(url: sourceAssetId) { [weak self] data in
      self?.processAssetBytes(data, asset: asset, factory: factory)
    }
  }

  private func handleSourceUrl(_ sourceUrl: String, asset: RiveFileAsset, factory: RiveFactory) {
    downloadUrlAsset(url: sourceUrl) { [weak self] data in
      self?.processAssetBytes(data, asset: asset, factory: factory)
    }
  }

  private func splitFileNameAndExtension(fileName: String) -> (name: String?, ext: String?)? {
    let components = fileName.split(separator: ".")
    let name = (fileName as NSString).deletingPathExtension
    let fileExtension = (fileName as NSString).pathExtension
    guard components.count == 2 else { return nil }
    return (name: name, ext: fileExtension)
  }

  private func loadResourceAsset(
    sourceAsset: String, path: String?, listener: @escaping (Data) -> Void
  ) {
    guard let splitSourceAssetName = splitFileNameAndExtension(fileName: sourceAsset),
      let name = splitSourceAssetName.name,
      let ext = splitSourceAssetName.ext
    else {
      handleRiveError(error: createAssetFileError(sourceAsset))
      return
    }

    guard let folderUrl = Bundle.main.url(forResource: name, withExtension: ext) else {
      handleRiveError(error: createAssetFileError(sourceAsset))
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
        }
      }
    }
  }

  private func handleSourceAsset(
    _ sourceAsset: String, path: String?, asset: RiveFileAsset, factory: RiveFactory
  ) {
    loadResourceAsset(sourceAsset: sourceAsset, path: path) { [weak self] data in
      self?.processAssetBytes(data, asset: asset, factory: factory)
    }
  }

  private func loadAssetInternal(
    source: ResolvedReferencedAsset, asset: RiveFileAsset, factory: RiveFactory
  ) {
    let sourceAssetId = source.sourceAssetId
    let sourceUrl = source.sourceUrl
    let sourceAsset = source.sourceAsset

    if let sourceAssetId = sourceAssetId {
      handleSourceAssetId(sourceAssetId, asset: asset, factory: factory)
    } else if let sourceUrl = sourceUrl {
      handleSourceUrl(sourceUrl, asset: asset, factory: factory)
    } else if let sourceAsset = sourceAsset {
      handleSourceAsset(sourceAsset, path: source.path, asset: asset, factory: factory)
    }
  }

  func loadAsset(
    source: ResolvedReferencedAsset, asset: RiveFileAsset, factory: RiveFactory
  ) {
    loadAssetInternal(source: source, asset: asset, factory: factory)
  }

  func createCustomLoader(referencedAssets: ReferencedAssetsType?, cache: SendableRef<ReferencedAssetCache>, factory factoryOut: SendableRef<RiveFactory?>)
    -> LoadAsset?
  {
    guard let referencedAssets = referencedAssets, let referencedAssets = referencedAssets.data
    else {
      return nil
    }
    return { (asset: RiveFileAsset, data: Data, factory: RiveFactory) -> Bool in
      let assetByUniqueName = referencedAssets[asset.uniqueName()]
      guard let assetData = assetByUniqueName ?? referencedAssets[asset.name()] else {
        return false
      }
      let usedKey = assetByUniqueName != nil ? asset.uniqueName() : asset.name()

      cache.value[asset.uniqueName()] = asset
      factoryOut.value = factory

      self.loadAssetInternal(source: assetData, asset: asset, factory: factory)

      return false
    }
  }
}
