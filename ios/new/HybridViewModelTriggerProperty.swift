@_spi(RiveExperimental) import RiveRuntime
import NitroModules

class HybridViewModelTriggerProperty: HybridViewModelTriggerPropertySpec {
  private let instance: ViewModelInstance
  private let prop: TriggerProperty
  private var listenerTasks: [UUID: Task<Void, Never>] = [:]

  init(instance: ViewModelInstance, path: String) {
    self.instance = instance
    self.prop = TriggerProperty(path: path)
    super.init()
  }

  func trigger() {
    // TODO: Experimental API trigger - API changed, needs update
    // instance.trigger(self.prop)
  }

  func addListener(onChanged: @escaping () -> Void) throws -> () -> Void {
    // TODO: Experimental API trigger stream - API changed, needs update
    // The triggerStream method may have been removed or renamed
    return {}
  }

  func removeListeners() throws {
    listenerTasks.values.forEach { $0.cancel() }
    listenerTasks.removeAll()
  }

  func dispose() throws {
    try removeListeners()
  }

  deinit {
    listenerTasks.values.forEach { $0.cancel() }
  }
}
