import RiveRuntime

class HybridViewModelArtboardProperty: HybridViewModelArtboardPropertySpec {
  private let property: ArtboardPropertyType

  init(property: ArtboardPropertyType) {
    self.property = property
    super.init()
  }

  func set(artboard: (any HybridBindableArtboardSpec)?) throws {
    if let hybridArtboard = artboard as? HybridBindableArtboard {
      property.setValue(hybridArtboard.bindableArtboard)
    } else {
      property.setValue(nil)
    }
  }
}
