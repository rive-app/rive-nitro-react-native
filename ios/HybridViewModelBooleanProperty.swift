import NitroModules
import RiveRuntime

class HybridViewModelBooleanProperty: HybridViewModelBooleanPropertySpec, ValuedPropertyProtocol {
  var property: BooleanPropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)
  
  init(property: BooleanPropertyType) {
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
}
