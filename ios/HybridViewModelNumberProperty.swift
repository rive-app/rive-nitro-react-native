import NitroModules
import RiveRuntime

class HybridViewModelNumberProperty: HybridViewModelNumberPropertySpec, ValuedPropertyProtocol {
  var property: NumberPropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)

  init(property: NumberPropertyType) {
    self.property = property
    super.init()
  }

  var value: Double {
    get { MainThread.run { Double(property.value) } }
    set { MainThread.run { property.value = Float(newValue) } }
  }

  func getValueAsync() throws -> Promise<Double> {
    return Promise.onMain { Double(self.property.value) }
  }

  func set(value: Double) throws {
    MainThread.run { property.value = Float(value) }
  }

  func addListener(onChanged: @escaping (Double) -> Void) throws -> () -> Void {
    return helper.addListener({ floatValue in onChanged(Double(floatValue)) })
  }
}
