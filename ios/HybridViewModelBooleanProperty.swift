import NitroModules
import RiveRuntime

class HybridViewModelBooleanProperty: HybridViewModelBooleanPropertySpec, ValuedPropertyProtocol {
  var property: BooleanPropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)
  
  init(property: BooleanPropertyType) {
    self.property = property
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
