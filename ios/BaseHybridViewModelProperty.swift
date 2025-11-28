import Foundation
import RiveRuntime

/// Protocol for Rive property types that support listener management
protocol RivePropertyWithListeners: AnyObject {
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
extension BooleanPropertyType: RivePropertyWithListeners {}
extension NumberPropertyType: RivePropertyWithListeners {}
extension StringPropertyType: RivePropertyWithListeners {}
extension EnumPropertyType: RivePropertyWithListeners {}
extension ColorPropertyType: RivePropertyWithListeners {}
extension TriggerPropertyType: RivePropertyWithListeners {}
extension ImagePropertyType: RivePropertyWithListeners {}

/// Helper class for managing ViewModel property listeners
/// Similar to Android's BaseHybridViewModelPropertyImpl, provides reusable listener management
class PropertyListenerHelper<PropertyType: RivePropertyWithListeners> {
  private var listenerIds: [UUID] = []
  weak var property: PropertyType?
  
  init(property: PropertyType) {
    self.property = property
  }
  
  /// Adds a listener and automatically tracks its ID for later cleanup
  /// - Parameter addListener: Closure that adds the listener to the property and returns the listener ID
  func trackListener(_ addListener: (PropertyType) -> UUID) {
    guard let property = property else { return }
    let id = addListener(property)
    listenerIds.append(id)
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

/// Protocol that provides common functionality for all hybrid ViewModel property classes
/// Reduces boilerplate by providing default implementations for listener management
protocol ViewModelPropertyProtocol {
  associatedtype PropertyType: RivePropertyWithListeners
  
  var helper: PropertyListenerHelper<PropertyType> { get }
  
  func removeListeners() throws
  func dispose() throws
}

/// Default implementations for common listener management methods
extension ViewModelPropertyProtocol {
  func removeListeners() throws {
    try helper.removeListeners()
  }
  
  func dispose() throws {
    try helper.dispose()
  }
}

