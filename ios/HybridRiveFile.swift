import RiveRuntime

typealias ReferencedAssetCache = [String: RiveFileAsset]

class HybridRiveFile: HybridRiveFileSpec {
  var riveFile: RiveFile?
  var referencedAssetCache: ReferencedAssetCache?
  
  public func setRiveFile(_ riveFile: RiveFile) {
    self.riveFile = riveFile
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
    
  }
  
  func release() throws {
    //  iOS does not need to release the Rive file.
    riveFile = nil
  }
  
  deinit {
    try? release()
  }
}
