import RiveRuntime

class HybridViewModelArtboardProperty: HybridViewModelArtboardPropertySpec, ValuedPropertyProtocol {
  typealias ValueType = Void

  var property: ArtboardPropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)

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

  func addListener(onChanged: @escaping () -> Void) throws -> () -> Void {
    return helper.addListener { _ in onChanged() }
  }
}
