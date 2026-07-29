import RiveRuntime
import NitroModules

class HybridViewModelArtboardProperty: HybridViewModelArtboardPropertySpec {
  private let instance: ViewModelInstance
  private let prop: ArtboardProperty
  private var currentArtboard: Artboard?

  /// Bumped by every set(). Instantiating an artboard is async, so a slow one can finish after
  /// a later set() has already applied — the generation it captured lets it detect that and bail.
  @MainActor private var generation: UInt64 = 0

  init(instance: ViewModelInstance, path: String) {
    self.instance = instance
    self.prop = ArtboardProperty(path: path)
    super.init()
  }

  func set(artboard: (any HybridBindableArtboardSpec)?) throws {
    guard let artboard = artboard else {
      Task { @MainActor in
        self.generation &+= 1
        self.instance.setValue(of: self.prop, to: nil)
        self.currentArtboard = nil
      }
      return
    }
    guard let hybridArtboard = artboard as? HybridBindableArtboard else {
      RCTLogWarn("[ArtboardProperty] set called with an incompatible artboard")
      return
    }

    Task { @MainActor in
      self.generation &+= 1
      let generation = self.generation
      do {
        let newArtboard = try await hybridArtboard.file.createArtboard(hybridArtboard.artboardName)
        guard generation == self.generation else { return }
        self.currentArtboard = newArtboard
        self.instance.setValue(of: self.prop, to: newArtboard)
      } catch {
        RCTLogError("[ArtboardProperty] Failed to set artboard '\(hybridArtboard.artboardName)': \(error)")
      }
    }
  }
}
