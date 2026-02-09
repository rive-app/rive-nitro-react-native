@_spi(RiveExperimental) import RiveRuntime
import NitroModules

class HybridViewModelArtboardProperty: HybridViewModelArtboardPropertySpec {
  private let instance: ViewModelInstance
  private let prop: ArtboardProperty
  private var currentArtboard: Artboard?

  init(instance: ViewModelInstance, path: String) {
    self.instance = instance
    self.prop = ArtboardProperty(path: path)
    super.init()
  }

  func set(artboard: (any HybridBindableArtboardSpec)?) throws {
    guard let hybridArtboard = artboard as? HybridBindableArtboard else {
      RCTLogWarn("[ArtboardProperty] set called with nil or incompatible artboard")
      return
    }

    Task { @MainActor in
      do {
        let newArtboard = try await hybridArtboard.file.createArtboard(hybridArtboard.artboardName)
        self.currentArtboard = newArtboard
        self.instance.setValue(of: self.prop, to: newArtboard)
      } catch {
        RCTLogError("[ArtboardProperty] Failed to set artboard '\(hybridArtboard.artboardName)': \(error)")
      }
    }
  }
}
