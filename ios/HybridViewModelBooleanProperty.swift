import NitroModules
import RiveRuntime

class HybridViewModelBooleanProperty: HybridViewModelBooleanPropertySpec, ViewModelPropertyProtocol {
  private var property: BooleanPropertyType!
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
  
  func addListener(onChanged: @escaping (Bool) -> Void) throws {
    helper.trackListener { property in
      property.addListener { value in
        onChanged(value)
      }
    }
  }
}
