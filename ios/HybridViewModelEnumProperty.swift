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
    get { MainThread.run { property.value } }
    set { MainThread.run { property.value = newValue } }
  }

  func getValueAsync() throws -> Promise<String> {
    return Promise.onMain { self.property.value }
  }

  func set(value: String) throws {
    MainThread.run { property.value = value }
  }
}
