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

  func getValueAsync() throws -> Promise<Bool> {
    return Promise.async { self.property.value }
  }

  func set(value: Bool) throws {
    property.value = value
  }
}
