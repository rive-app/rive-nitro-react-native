import NitroModules
import RiveRuntime

class HybridViewModelStringProperty: HybridViewModelStringPropertySpec, ValuedPropertyProtocol {
  var property: StringPropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)
  
  init(property: StringPropertyType) {
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
