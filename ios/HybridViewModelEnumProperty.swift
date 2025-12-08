import NitroModules
import RiveRuntime

class HybridViewModelEnumProperty: HybridViewModelEnumPropertySpec, ValuedPropertyProtocol {
  var property: EnumPropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)
  
  init(property: EnumPropertyType) {
    self.property = property
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
