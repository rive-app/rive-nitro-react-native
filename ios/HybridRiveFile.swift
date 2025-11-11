import RiveRuntime

typealias ReferencedAssetCache = [String: RiveFileAsset]

class HybridRiveFile: HybridRiveFileSpec {
  var riveFile: RiveFile?
  var referencedAssetCache: ReferencedAssetCache?
  var assetLoader: ReferencedAssetLoader?
  var cachedFactory: RiveFactory?
  private var weakViews: [Weak<RiveReactNativeView>] = []

  public func setRiveFile(_ riveFile: RiveFile) {
    self.riveFile = riveFile
  }

  func registerView(_ view: RiveReactNativeView) {
    weakViews.append(Weak(view))
  }

  func unregisterView(_ view: RiveReactNativeView) {
    weakViews.removeAll { $0.value === view }
  }

  private func refreshAfterAssetChange() {
    weakViews = weakViews.filter { $0.value != nil }

    for weakView in weakViews {
      guard let view = weakView.value else { continue }
      view.refreshAfterAssetChange()
    }
  }
  
  var viewModelCount: Double? {
    guard let count = riveFile?.viewModelCount else { return nil }
    return Double(count)
  }
  
  func viewModelByIndex(index: Double) throws -> (any HybridViewModelSpec)? {
    guard let vm = riveFile?.viewModel(at: UInt(index)) else { return nil }
    return HybridViewModel(viewModel: vm)
  }
  
  func viewModelByName(name: String) throws -> (any HybridViewModelSpec)? {
    guard let vm = riveFile?.viewModelNamed(name) else { return nil }
    return HybridViewModel(viewModel: vm)
  }
  
  func defaultArtboardViewModel(artboardBy: ArtboardBy?) throws -> (any HybridViewModelSpec)? {
    let artboard: RiveArtboard?
    
    if let artboardBy = artboardBy {
      switch artboardBy.type {
      case .index:
        guard let index = artboardBy.index else { return nil }
        artboard = try? riveFile?.artboard(from: Int(index))
      case .name:
        guard let name = artboardBy.name else { return nil }
        artboard = try? riveFile?.artboard(fromName: name)
      default:
        artboard = nil
      }
    } else {
      artboard = try? riveFile?.artboard()
    }
    
    guard let artboard = artboard,
          let vm = riveFile?.defaultViewModel(for: artboard) else { return nil }
    return HybridViewModel(viewModel: vm)
  }
  
  func updateReferencedAssets(referencedAssets: ReferencedAssetsType) {
    guard let assetsData = referencedAssets.data,
          let cache = referencedAssetCache,
          let loader = assetLoader,
          let _ = riveFile else {
      return
    }

    let dispatchGroup = DispatchGroup()
    var hasChanged = false

    for (key, assetData) in assetsData {
      guard let asset = cache[key] else { continue }
      if let riveFactory = cachedFactory {
        dispatchGroup.enter()
        loader.loadAsset(source: assetData, asset: asset, factory: riveFactory) {
          dispatchGroup.leave()
        }
      } else {
        RCTLogError("[RiveFile] no factory available for update")
      }
      hasChanged = true
    }

    if hasChanged {
      dispatchGroup.notify(queue: .main) { [weak self] in
        self?.refreshAfterAssetChange()
      }
    }
  }
  
  func release() throws {
    //  iOS does not need to release the Rive file.
    riveFile = nil
  }
  
  deinit {
    try? release()
  }
}
