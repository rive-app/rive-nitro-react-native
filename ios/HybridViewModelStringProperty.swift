import NitroModules
import RiveRuntime

class HybridViewModelStringProperty: HybridViewModelStringPropertySpec {
  private var property: RiveDataBindingViewModel.Instance.StringProperty!
  private var listenerIds: [UUID] = []
  
  init(property: RiveDataBindingViewModel.Instance.StringProperty) {
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
  
  var value: String {
    get {
      return property.value
    }
    set {
      property.value = newValue
    }
  }
  
  func addListener(onChanged: @escaping (String) -> Void) throws {
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
