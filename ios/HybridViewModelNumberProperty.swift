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

  func addListener(onChanged: @escaping (Double) -> Void) throws -> () -> Void {
    return helper.addListener({ floatValue in onChanged(Double(floatValue)) })
  }
}
