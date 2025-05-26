import NitroModules
import RiveRuntime

class HybridViewModelTriggerProperty: HybridViewModelTriggerPropertySpec {
  private var property: RiveDataBindingViewModel.Instance.TriggerProperty!
  private var listenerIds: [UUID] = []
  
  init(property: RiveDataBindingViewModel.Instance.TriggerProperty) {
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
  
  func trigger() {
    property.trigger()
  }
  
  func addListener(onChanged: @escaping () -> Void) throws {
    let id = property.addListener({ onChanged() })
    listenerIds.append(id)
  }
  
  func removeListeners() throws {
    for id in listenerIds {
      property.removeListener(id)
    }
    listenerIds.removeAll()
  }
  
  func dispose() throws {
    try? removeListeners()
  }
}
