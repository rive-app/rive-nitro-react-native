import RiveRuntime

class HybridViewModelImageProperty: HybridViewModelImagePropertySpec {
  var property: RiveDataBindingViewModel.Instance.ImageProperty!
  private var listenerIds: [UUID] = []

  init(property: RiveDataBindingViewModel.Instance.ImageProperty) {
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

  func addListener(onChanged: @escaping () -> Void) throws {
    let id = property.addListener({
      onChanged()
    })

    listenerIds.append(id)
  }

  func removeListeners() throws {
    for id in listenerIds {
      property.removeListener(id)
    }
    listenerIds.removeAll()
  }

  func dispose() throws {
    try? removeListeners()
  }
}
