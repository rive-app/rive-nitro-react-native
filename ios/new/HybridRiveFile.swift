@_spi(RiveExperimental) import RiveRuntime
import NitroModules

class HybridRiveFile: HybridRiveFileSpec {
  var file: File?
  var worker: Worker?

  override init() {
    super.init()
  }

  init(file: File, worker: Worker) {
    self.file = file
    self.worker = worker
  }

  // Deprecated: Use getViewModelCountAsync instead
  var viewModelCount: Double? {
    guard let file = file else { return nil }
    do {
      let names = try blockingAsync { try await file.getViewModelNames() }
      return Double(names.count)
    } catch {
      RCTLogError("[RiveFile] viewModelCount failed: \(error)")
      return nil
    }
  }

  func getViewModelCountAsync() throws -> Promise<Double?> {
    guard let file = file else { return Promise.resolved(withResult: nil) }
    return Promise.async {
      let names = try await file.getViewModelNames()
      return Double(names.count)
    }
  }

  private func viewModelByIndexImpl(index: Double) async throws -> (any HybridViewModelSpec)? {
    guard let file = file, let worker = worker else { return nil }
    let names = try await file.getViewModelNames()
    let idx = Int(index)
    guard idx >= 0 && idx < names.count else { return nil }
    return HybridViewModel(file: file, vmName: names[idx], worker: worker)
  }

  // Deprecated: Use viewModelByIndexAsync instead
  func viewModelByIndex(index: Double) throws -> (any HybridViewModelSpec)? {
    return try blockingAsync { try await self.viewModelByIndexImpl(index: index) }
  }

  func viewModelByIndexAsync(index: Double) throws -> Promise<(any HybridViewModelSpec)?> {
    return Promise.async { try await self.viewModelByIndexImpl(index: index) }
  }

  private func viewModelByNameImpl(name: String) async throws -> (any HybridViewModelSpec)? {
    guard let file = file, let worker = worker else { return nil }
    let names = try await file.getViewModelNames()
    guard names.contains(name) else { return nil }
    return HybridViewModel(file: file, vmName: name, worker: worker)
  }

  // Deprecated: Use viewModelByNameAsync instead
  func viewModelByName(name: String) throws -> (any HybridViewModelSpec)? {
    return try blockingAsync { try await self.viewModelByNameImpl(name: name) }
  }

  func viewModelByNameAsync(name: String) throws -> Promise<(any HybridViewModelSpec)?> {
    return Promise.async { try await self.viewModelByNameImpl(name: name) }
  }

  private func defaultArtboardViewModelImpl(artboardBy: ArtboardBy?) async throws -> (any HybridViewModelSpec)? {
    guard let file = file, let worker = worker else { return nil }
    let artboardName: String?
    if let artboardBy = artboardBy {
      switch artboardBy.type {
      case .name:
        artboardName = artboardBy.name
      case .index:
        guard let index = artboardBy.index else { return nil }
        let names = try await file.getArtboardNames()
        let idx = Int(index)
        guard idx >= 0 && idx < names.count else { return nil }
        artboardName = names[idx]
      default:
        artboardName = nil
      }
    } else {
      artboardName = nil
    }

    let artboard = try await file.createArtboard(artboardName)
    let vmInfo = try await file.getDefaultViewModelInfo(for: artboard)
    return HybridViewModel(file: file, vmName: vmInfo.viewModelName, worker: worker)
  }

  // Deprecated: Use defaultArtboardViewModelAsync instead
  func defaultArtboardViewModel(artboardBy: ArtboardBy?) throws -> (any HybridViewModelSpec)? {
    return try blockingAsync { try await self.defaultArtboardViewModelImpl(artboardBy: artboardBy) }
  }

  func defaultArtboardViewModelAsync(artboardBy: ArtboardBy?) throws -> Promise<(any HybridViewModelSpec)?> {
    return Promise.async { try await self.defaultArtboardViewModelImpl(artboardBy: artboardBy) }
  }

  // Deprecated: Use getArtboardCountAsync instead
  var artboardCount: Double {
    guard let file = file else { return 0 }
    do {
      let names = try blockingAsync { try await file.getArtboardNames() }
      return Double(names.count)
    } catch {
      RCTLogError("[RiveFile] artboardCount failed: \(error)")
      return 0
    }
  }

  func getArtboardCountAsync() throws -> Promise<Double> {
    guard let file = file else { return Promise.resolved(withResult: 0) }
    return Promise.async {
      let names = try await file.getArtboardNames()
      return Double(names.count)
    }
  }

  // Deprecated: Use getArtboardNamesAsync instead
  var artboardNames: [String] {
    guard let file = file else { return [] }
    do {
      return try blockingAsync { try await file.getArtboardNames() }
    } catch {
      RCTLogError("[RiveFile] artboardNames failed: \(error)")
      return []
    }
  }

  func getArtboardNamesAsync() throws -> Promise<[String]> {
    guard let file = file else { return Promise.resolved(withResult: []) }
    return Promise.async {
      try await file.getArtboardNames()
    }
  }

  func getBindableArtboard(name: String) throws -> any HybridBindableArtboardSpec {
    guard let file = file else {
      throw RuntimeError.error(withMessage: "No file available for getBindableArtboard")
    }
    return HybridBindableArtboard(name: name, file: file)
  }

  func updateReferencedAssets(referencedAssets: ReferencedAssetsType) {
    guard let worker = worker else {
      RCTLogWarn("HybridRiveFile.updateReferencedAssets: No worker available")
      return
    }
    RCTLogInfo("HybridRiveFile.updateReferencedAssets: Updating \(referencedAssets.data?.count ?? 0) assets (note: existing artboards won't refresh)")
    Task { @MainActor in
      await ExperimentalAssetLoader.registerAssets(referencedAssets, on: worker)
    }
  }

  func getEnums() throws -> Promise<[RiveEnumDefinition]> {
    guard let file = file else { return Promise.resolved(withResult: []) }
    return Promise.async {
      let viewModelEnums = try await file.getViewModelEnums()
      return viewModelEnums.map { vmEnum in
        RiveEnumDefinition(name: vmEnum.name, values: vmEnum.values)
      }
    }
  }

  func dispose() {
    file = nil
    worker = nil
  }

  deinit {
    dispose()
  }
}
