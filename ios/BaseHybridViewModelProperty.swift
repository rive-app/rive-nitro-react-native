import Foundation
import RiveRuntime

/// Protocol for Rive property types that support listener management
protocol RivePropertyWithListeners: AnyObject {
  associatedtype ListenerValueType
  typealias ListenerType = (ListenerValueType) -> Void

  func addListener(_ callback: @escaping ListenerType) -> UUID
  func removeListener(_ id: UUID)
}

/// Protocol for Rive property types with void listeners (Trigger, Image)
protocol RivePropertyWithVoidListeners: AnyObject {
  func addListener(_ callback: @escaping () -> Void) -> UUID
  func removeListener(_ id: UUID)
}

typealias BooleanPropertyType = RiveDataBindingViewModel.Instance.BooleanProperty
typealias NumberPropertyType = RiveDataBindingViewModel.Instance.NumberProperty
typealias StringPropertyType = RiveDataBindingViewModel.Instance.StringProperty
typealias EnumPropertyType = RiveDataBindingViewModel.Instance.EnumProperty
typealias ColorPropertyType = RiveDataBindingViewModel.Instance.ColorProperty
typealias TriggerPropertyType = RiveDataBindingViewModel.Instance.TriggerProperty
typealias ImagePropertyType = RiveDataBindingViewModel.Instance.ImageProperty

// Make all Rive property types conform to the protocol
extension BooleanPropertyType: RivePropertyWithListeners {
  typealias ListenerValueType = Bool  // Native: Bool → Bool (no conversion)
}
extension NumberPropertyType: RivePropertyWithListeners {
  typealias ListenerValueType = Float  // Native: Float → Double (needs conversion)
}
extension StringPropertyType: RivePropertyWithListeners {
  typealias ListenerValueType = String  // Native: String → String (no conversion)
}
extension EnumPropertyType: RivePropertyWithListeners {
  typealias ListenerValueType = String  // Native: String → String (no conversion)
}
extension ColorPropertyType: RivePropertyWithListeners {
  typealias ListenerValueType = UIColor  // Native: UIColor → Double (needs conversion)
}
extension TriggerPropertyType: RivePropertyWithListeners {
  func addListener(_ callback: @escaping ListenerType) -> UUID {
    addListener { callback(()) }
  }

  typealias ListenerValueType = Void
}

extension ImagePropertyType: RivePropertyWithListeners {
  typealias ListenerValueType = Void

  func addListener(_ callback: @escaping ListenerType) -> UUID {
    addListener { callback(()) }
  }
}

/// Helper class for managing ViewModel property listeners
class PropertyListenerHelper<PropertyType: RivePropertyWithListeners> {
  private var listenerIds: [UUID] = []
  weak var property: PropertyType?

  init(property: PropertyType) {
    self.property = property
  }

  /// Adds a listener to the property and returns a removal function for cleanup
  func addListener(_ callback: @escaping (PropertyType.ListenerValueType) -> Void) -> () -> Void {
    guard let property = property else {
      return {}
    }
    let id = property.addListener(callback)
    listenerIds.append(id)
    return { [weak self, weak property] in
      guard let property = property else { return }
      property.removeListener(id)
      self?.listenerIds.removeAll { $0 == id }
    }
  }

  func removeListeners() throws {
    guard let property = property else { return }
    for id in listenerIds {
      property.removeListener(id)
    }
    listenerIds.removeAll()
  }

  func dispose() throws {
    try? removeListeners()
  }
}

/// Protocol for properties that have typed values (Bool, String, Double, etc.)
/// Provides a default addListener implementation
protocol ValuedPropertyProtocol<ValueType> {
  associatedtype PropertyType: RivePropertyWithListeners
  associatedtype ValueType

  var property: PropertyType! { get }
  var helper: PropertyListenerHelper<PropertyType> { get }

  func addListener(onChanged: @escaping (ValueType) -> Void) throws -> () -> Void
  func removeListeners() throws
  func dispose() throws
}

/// Default implementations for lifecycle methods (always available)
extension ValuedPropertyProtocol {
  func removeListeners() throws {
    try helper.removeListeners()
  }

  func dispose() throws {
    try helper.dispose()
  }
}

/// Automatic addListener() ONLY when ListenerValueType == ValueType (no conversion needed)
extension ValuedPropertyProtocol where PropertyType.ListenerValueType == ValueType {
  func addListener(onChanged: @escaping (ValueType) -> Void) throws -> () -> Void {
    return helper.addListener(onChanged)
  }
}
