import RiveRuntime
import NitroModules

class HybridViewModelTriggerProperty: HybridViewModelTriggerPropertySpec {
  private let instance: ViewModelInstance
  private let prop: TriggerProperty
  private var listenerTasks: [UUID: Task<Void, any Error>] = [:]

  init(instance: ViewModelInstance, path: String) {
    self.instance = instance
    self.prop = TriggerProperty(path: path)
    super.init()
  }

  func trigger() {
    let inst = instance
    let p = prop
    Task { @MainActor in
      inst.fire(trigger: p)
    }
  }

  func addListener(onChanged: @escaping () -> Void) throws -> () -> Void {
    let id = UUID()
    // Capture the dependencies, not self: the infinite stream loop would
    // otherwise keep this wrapper alive until listeners are removed
    // explicitly, making the deinit cancelAll() safety net unreachable.
    let inst = instance
    let p = prop
    let task = Task { @MainActor in
      for try await _ in inst.stream(of: p) {
        onChanged()
      }
    }
    listenerTasks[id] = task
    return { [weak self] in
      self?.listenerTasks[id]?.cancel()
      self?.listenerTasks.removeValue(forKey: id)
    }
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
