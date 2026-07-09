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
    get { MainThread.run { property.value } }
    set { MainThread.run { property.value = newValue } }
  }

  func getValueAsync() throws -> Promise<String> {
    return Promise.onMain { self.property.value }
  }

  func set(value: String) throws {
    MainThread.run { property.value = value }
  }

  func setValueAsync(value: String) throws -> Promise<Void> {
    // Main-thread write like every other legacy mutation — Promise.async
    // would race the main-thread render loop.
    return Promise.onMain { self.property.value = value }
  }
}
