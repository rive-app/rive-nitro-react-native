import NitroModules
import RiveRuntime

class HybridBindableArtboard: HybridBindableArtboardSpec {
  internal var bindableArtboard: RiveBindableArtboard?

  init(bindableArtboard: RiveBindableArtboard) {
    self.bindableArtboard = bindableArtboard
    super.init()
  }

  var artboardName: String {
    guard let artboard = bindableArtboard else {
      RCTLogError("[BindableArtboard] has been disposed")
      return ""
    }
    return artboard.name
  }

  func dispose() {
    bindableArtboard = nil
  }
}
