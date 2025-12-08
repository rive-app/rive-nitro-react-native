import NitroModules
import RiveRuntime

class HybridViewModelEnumProperty: HybridViewModelEnumPropertySpec, ValuedPropertyProtocol {
  var property: EnumPropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)
  
  init(property: EnumPropertyType) {
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
}
