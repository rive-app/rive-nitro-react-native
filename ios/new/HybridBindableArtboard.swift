@_spi(RiveExperimental) import RiveRuntime
import NitroModules

class HybridBindableArtboard: HybridBindableArtboardSpec {
  private let name: String
  let file: File

  init(name: String, file: File) {
    self.name = name
    self.file = file
    super.init()
  }

  var artboardName: String { name }

  func dispose() {
    // Cleanup handled by ARC
  }
}
