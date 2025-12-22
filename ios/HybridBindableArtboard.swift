import NitroModules
import RiveRuntime

class HybridBindableArtboard: HybridBindableArtboardSpec {
  let bindableArtboard: RiveBindableArtboard

  init(bindableArtboard: RiveBindableArtboard) {
    self.bindableArtboard = bindableArtboard
    super.init()
  }

  var artboardName: String {
    bindableArtboard.name
  }

  func dispose() {
    // iOS uses ARC, no explicit cleanup needed
  }
}
