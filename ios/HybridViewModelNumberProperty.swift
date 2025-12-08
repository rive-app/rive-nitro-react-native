import RiveRuntime

class HybridViewModelNumberProperty: HybridViewModelNumberPropertySpec, ValuedPropertyProtocol {
  var property: NumberPropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)

  init(property: NumberPropertyType) {
    self.property = property
    super.init()
  }

  /// ⚠️ DO NOT REMOVE
  /// Nitro requires a parameterless initializer for JS bridging.
  /// This is invoked automatically during hybrid module construction.
  /// Internally we always use `init(property:)`
  override init() {
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

  // Custom addListener needed because ListenerValueType (Float) != ValueType (Double)
  func addListener(onChanged: @escaping (Double) -> Void) throws {
    helper.addListener { (value: Float) in
      onChanged(Double(value))
    }
  }
}
