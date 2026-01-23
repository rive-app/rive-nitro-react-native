import NitroModules
import RiveRuntime
#if RIVE_EXPERIMENTAL_API
@_spi(RiveExperimental) import RiveRuntime
#endif

typealias ReferencedAssetCache = [String: RiveFileAsset]

/// Source for creating experimental File instances
enum ExperimentalFileSource {
  case data(Data)
  case resource(String)
}

class HybridRiveFile: HybridRiveFileSpec, RiveViewSource {
  var riveFile: RiveFile?
  var referencedAssetCache: ReferencedAssetCache?
  var assetLoader: ReferencedAssetLoader?
  var cachedFactory: RiveFactory?
  private var weakViews: [Weak<RiveReactNativeView>] = []

  /// Source for experimental API - stored to create experimental File on demand
  var experimentalSource: ExperimentalFileSource?

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
  
  var artboardCount: Double {
    Double(riveFile?.artboardNames().count ?? 0)
  }

  var artboardNames: [String] {
    riveFile?.artboardNames() ?? []
  }

  func getBindableArtboard(name: String) throws -> any HybridBindableArtboardSpec {
    guard let bindable = try riveFile?.bindableArtboard(withName: name) else {
      throw NSError(
        domain: "RiveError",
        code: 0,
        userInfo: [NSLocalizedDescriptionKey: "Artboard '\(name)' not found"]
      )
    }
    return HybridBindableArtboard(bindableArtboard: bindable)
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
  
  func getEnums() throws -> Promise<[RiveEnumDefinition]> {
    return Promise.async { [weak self] in
      #if RIVE_EXPERIMENTAL_API
      guard let source = self?.experimentalSource else {
        throw NSError(
          domain: "RiveError",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "getEnums requires experimental API. Use USE_RIVE_SPM=1 with pod install."]
        )
      }

      // Create worker and experimental file on demand
      let worker = await Worker()
      let experimentalSource: Source
      switch source {
      case .data(let data):
        experimentalSource = .data(data)
      case .resource(let name):
        experimentalSource = .local(name, nil)
      }

      let file = try await File(source: experimentalSource, worker: worker)
      let viewModelEnums = try await file.getViewModelEnums()
      return viewModelEnums.map { vmEnum in
        RiveEnumDefinition(name: vmEnum.name, values: vmEnum.values)
      }
      #else
      throw NSError(
        domain: "RiveError",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "getEnums requires RiveRuntime 6.15.0+ with experimental API. Use USE_RIVE_SPM=1 with pod install."]
      )
      #endif
    }
  }

  func dispose() {
    weakViews.removeAll()
    referencedAssetCache = nil
    assetLoader = nil
    cachedFactory = nil
    riveFile = nil
  }

  deinit {
    dispose()
  }
}
