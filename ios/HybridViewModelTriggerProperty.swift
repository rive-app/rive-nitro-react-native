import NitroModules
import RiveRuntime

class HybridViewModelTriggerProperty: HybridViewModelTriggerPropertySpec, ViewModelPropertyProtocol {
  private var property: TriggerPropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)
  
  init(property: TriggerPropertyType) {
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
  
  func trigger() {
    property.trigger()
  }
  
  func addListener(onChanged: @escaping () -> Void) throws {
    helper.trackListener { property in
      property.addListener {
        onChanged()
      }
    }
  }
  
}
