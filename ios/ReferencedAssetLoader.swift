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
  private static let decodeQueue = DispatchQueue(label: "com.rive.asset-decode")
  private var activeLoadCount = 0
  private var activeFileRef: RiveFile?

  func setFileRef(_ file: RiveFile) {
    activeFileRef = file
  }

  private func retainFile() {
    activeLoadCount += 1
  }

  private func releaseFile() {
    dispatchPrecondition(condition: .onQueue(.main))
    activeLoadCount -= 1
    if activeLoadCount <= 0 {
      activeLoadCount = 0
      activeFileRef = nil
    }
  }

  private func handleRiveError(error: Error) {
    RCTLogError("\(error)")
  }

  /// Decodes an asset on a background serial queue, then applies the result
  /// on the main thread. The `[self]` capture keeps `activeFileRef` alive
  /// until completion, preventing use-after-free on the factory.
  private func decodeAndApply<T>(
    decode: @escaping () -> T?,
    apply: @escaping (T) -> Void,
    completion: @escaping () -> Void
  ) {
    Self.decodeQueue.async { [self] in
      let result = decode()
      DispatchQueue.main.async {
        if let result { apply(result) }
        completion()
        _ = self
      }
    }
  }

  private func processAssetBytes(
    _ data: Data, asset: RiveFileAsset, factory: RiveFactory, completion: @escaping () -> Void
  ) {
    if data.isEmpty {
      completion()
      return
    }
    switch asset {
    case let imageAsset as RiveImageAsset:
      decodeAndApply(
        decode: { factory.decodeImage(data) },
        apply: { imageAsset.renderImage($0) },
        completion: completion)
    case let fontAsset as RiveFontAsset:
      decodeAndApply(
        decode: { factory.decodeFont(data) },
        apply: { fontAsset.font($0) },
        completion: completion)
    case let audioAsset as RiveAudioAsset:
      decodeAndApply(
        decode: { factory.decodeAudio(data) },
        apply: { audioAsset.audio($0) },
        completion: completion)
    default:
      completion()
    }
  }

  private func handlePreloadedImage(
    _ image: any HybridRiveImageSpec, asset: RiveFileAsset, completion: @escaping () -> Void
  ) {
    guard let imageAsset = asset as? RiveImageAsset,
      let hybridImage = image as? HybridRiveImage
    else {
      DispatchQueue.main.async { completion() }
      return
    }

    DispatchQueue.main.async {
      imageAsset.renderImage(hybridImage.renderImage)
      completion()
    }
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
        let data = try await dataSource.createLoader().load(from: dataSource)
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
    factory factoryOut: SendableRef<RiveFactory?>
  )
    -> LoadAsset?
  {
    guard let referencedAssets = referencedAssets, let referencedAssets = referencedAssets.data
    else {
      return nil
    }
    return { [weak self] (asset: RiveFileAsset, _: Data, factory: RiveFactory) -> Bool in
      let assetByUniqueName = referencedAssets[asset.uniqueName()]
      guard let assetData = assetByUniqueName ?? referencedAssets[asset.name()] else {
        return false
      }

      cache.value[asset.uniqueName()] = asset
      factoryOut.value = factory

      self?.retainFile()
      self?.loadAssetInternal(
        source: assetData, asset: asset, factory: factory,
        completion: { [weak self] in
          self?.releaseFile()
        })

      return true
    }
  }
}
