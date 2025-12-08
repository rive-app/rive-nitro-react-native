import NitroModules
import RiveRuntime

class HybridViewModelTriggerProperty: HybridViewModelTriggerPropertySpec, ValuedPropertyProtocol {
  internal var property: TriggerPropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)
  private var listenerIds: [UUID] = []

  init(property: TriggerPropertyType) {
    self.property = property
    super.init()
  }

  func trigger() {
    property.trigger()
  }

  func addListener(onChanged: @escaping () -> Void) throws -> () -> Void {
    try addListener(onChanged: { _ in onChanged() })
  }
}
