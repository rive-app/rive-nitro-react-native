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
    get { MainThread.run { property.value } }
    set { MainThread.run { property.value = newValue } }
  }

  func getValueAsync() throws -> Promise<Bool> {
    return Promise.onMain { self.property.value }
  }

  func set(value: Bool) throws {
    MainThread.run { property.value = value }
  }
}
