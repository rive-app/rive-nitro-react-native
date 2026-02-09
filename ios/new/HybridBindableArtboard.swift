@_spi(RiveExperimental) import RiveRuntime
import NitroModules

class HybridBindableArtboard: HybridBindableArtboardSpec {
  private let name: String

  init(name: String) {
    self.name = name
    super.init()
  }

  var artboardName: String { name }

  func dispose() {
    // Cleanup handled by ARC
  }
}
