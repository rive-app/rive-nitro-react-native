import NitroModules
import RiveRuntime

class HybridViewModelBooleanProperty: HybridViewModelBooleanPropertySpec {
  private var property: RiveDataBindingViewModel.Instance.BooleanProperty!
  private var listenerIds: [UUID] = []
  
  init(property: RiveDataBindingViewModel.Instance.BooleanProperty) {
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
  
  var value: Bool {
    get {
      return property.value
    }
    set {
      property.value = newValue
    }
  }
  
  func addListener(onChanged: @escaping (Bool) -> Void) throws {
    let id = property.addListener({ value in
      onChanged(value)
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
