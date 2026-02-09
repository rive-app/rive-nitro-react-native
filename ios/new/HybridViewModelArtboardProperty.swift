@_spi(RiveExperimental) import RiveRuntime
import NitroModules

class HybridViewModelArtboardProperty: HybridViewModelArtboardPropertySpec {
  private let instance: ViewModelInstance
  private let prop: ArtboardProperty

  init(instance: ViewModelInstance, path: String) {
    self.instance = instance
    self.prop = ArtboardProperty(path: path)
    super.init()
  }

  func set(artboard: (any HybridBindableArtboardSpec)?) throws {
    // TODO: Experimental API artboard property set
  }
}
