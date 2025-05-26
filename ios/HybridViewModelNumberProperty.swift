import RiveRuntime

class HybridViewModelNumberProperty: HybridViewModelNumberPropertySpec {
  var property: RiveDataBindingViewModel.Instance.NumberProperty!
  private var listenerIds: [UUID] = []
  
  init(property: RiveDataBindingViewModel.Instance.NumberProperty) {
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
  
  var value: Double {
    get {
      return Double(property.value)
    }
    set {
      property.value = Float(newValue)
    }
  }
  
  func addListener(onChanged: @escaping (Double) -> Void) throws {
    let id = property.addListener({ value in
      onChanged(Double(value))
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
