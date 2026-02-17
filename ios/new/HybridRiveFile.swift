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

  func viewModelByIndex(index: Double) throws -> (any HybridViewModelSpec)? {
    guard let file = file, let worker = worker else { return nil }
    let names = try blockingAsync { try await file.getViewModelNames() }
    let idx = Int(index)
    guard idx >= 0 && idx < names.count else { return nil }
    return HybridViewModel(file: file, vmName: names[idx], worker: worker)
  }

  func viewModelByName(name: String) throws -> (any HybridViewModelSpec)? {
    guard let file = file, let worker = worker else { return nil }
    let names = try blockingAsync { try await file.getViewModelNames() }
    guard names.contains(name) else { return nil }
    return HybridViewModel(file: file, vmName: name, worker: worker)
  }

  func defaultArtboardViewModel(artboardBy: ArtboardBy?) throws -> (any HybridViewModelSpec)? {
    guard let file = file, let worker = worker else { return nil }
    return try blockingAsync {
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
  }

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

  var artboardNames: [String] {
    guard let file = file else { return [] }
    do {
      return try blockingAsync { try await file.getArtboardNames() }
    } catch {
      RCTLogError("[RiveFile] artboardNames failed: \(error)")
      return []
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
    guard let file = file else { return Promise.resolved([]) }
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
