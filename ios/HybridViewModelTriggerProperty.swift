import NitroModules
import RiveRuntime

class HybridViewModelTriggerProperty: HybridViewModelTriggerPropertySpec {
  private var property: TriggerPropertyType!
  private var listenerIds: [UUID] = []
  
  init(property: TriggerPropertyType) {
    self.property = property
    super.init()
  }

  func trigger() {
    property.trigger()
  }
  
  func addListener(onChanged: @escaping () -> Void) throws {
    let id = property.addListener {
      onChanged()
    }
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
