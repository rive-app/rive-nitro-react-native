import NitroModules
import RiveRuntime

class HybridViewModelStringProperty: HybridViewModelStringPropertySpec, ValuedPropertyProtocol {
  var property: StringPropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)
  
  init(property: StringPropertyType) {
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
