import RiveRuntime

class HybridViewModelImageProperty: HybridViewModelImagePropertySpec, ValuedPropertyProtocol {
  func addListener(onChanged: @escaping () -> Void) throws {
    try addListener(onChanged: { _ in onChanged() })
  }
  
  var property: ImagePropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)

  init(property: ImagePropertyType) {
    self.property = property
    super.init()
  }

  /// ⚠️ DO NOT REMOVE
  /// Nitro requires a parameterless initializer for JS bridging.
  /// This is invoked automatically during hybrid module construction.
  /// Internally we always use `init(property:)`
  override init() {
    super.init()
  }

  func set(image: HybridRiveImageSpec?) throws {
    if let hybridImage = image as? HybridRiveImage {
      property.setValue(hybridImage.renderImage)
    } else {
      property.setValue(nil)
    }
  }
}
