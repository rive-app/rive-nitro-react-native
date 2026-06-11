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

  func getValueAsync() throws -> Promise<String> {
    return Promise.async { self.property.value }
  }

  func set(value: String) throws {
    property.value = value
  }

  func setValueAsync(value: String) throws -> Promise<Void> {
    return Promise.async { self.property.value = value }
  }
}
