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
    get {
      return Double(property.value)
    }
    set {
      property.value = Float(newValue)
    }
  }

  func getValueAsync() throws -> Promise<Double> {
    return Promise.async { Double(self.property.value) }
  }

  func set(value: Double) throws {
    property.value = Float(value)
  }

  func setValueAsync(value: Double) throws -> Promise<Void> {
    let v = Float(value)
    return Promise.async { self.property.value = v }
  }

  func addListener(onChanged: @escaping (Double) -> Void) throws -> () -> Void {
    return helper.addListener({ floatValue in onChanged(Double(floatValue)) })
  }
}
