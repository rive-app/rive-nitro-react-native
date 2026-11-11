import RiveRuntime
import NitroModules

/// The runtime ignores fires older than a state machine, and creating one takes several
/// async hops on iOS, so fires sent meanwhile wait until no view is still creating its machine.
@MainActor
enum TriggerFireGate {
  private static let configureTimeoutNanoseconds: UInt64 = 5_000_000_000
  private static var configuringViews = Set<UUID>()
  private static var heldFires: [() -> Void] = []

  /// A configure stops counting after the timeout, so a hung one can't hold fires forever.
  static func viewWillConfigure() -> UUID {
    let configuration = UUID()
    configuringViews.insert(configuration)
    Task {
      try? await Task.sleep(nanoseconds: configureTimeoutNanoseconds)
      viewDidConfigure(configuration)
    }
    return configuration
  }

  static func viewDidConfigure(_ configuration: UUID) {
    guard configuringViews.remove(configuration) != nil, configuringViews.isEmpty else { return }
    let fires = heldFires
    heldFires.removeAll()
    fires.forEach { $0() }
  }

  static func fire(_ trigger: TriggerProperty, on instance: ViewModelInstance) {
    if !configuringViews.isEmpty {
      heldFires.append { instance.fire(trigger: trigger) }
    } else {
      instance.fire(trigger: trigger)
    }
  }
}

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
      TriggerFireGate.fire(p, on: inst)
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
