@_spi(RiveExperimental) import RiveRuntime
import NitroModules

class HybridViewModelNumberProperty: HybridViewModelNumberPropertySpec {
  private let instance: ViewModelInstance
  private let prop: NumberProperty
  private var listenerTasks: [UUID: Task<Void, Never>] = [:]

  init(instance: ViewModelInstance, path: String) {
    self.instance = instance
    self.prop = NumberProperty(path: path)
    super.init()
  }

  // Deprecated: Use getValueAsync instead (for reading)
  var value: Double {
    get {
      do {
        return try blockingAsync { try await Double(self.instance.value(of: self.prop)) }
      } catch {
        RCTLogError("[NumberProperty] getValue failed: \(error)")
        return 0
      }
    }
    set {
      let inst = instance
      let p = prop
      let v = Float(newValue)
      Task { @MainActor in
        inst.setValue(of: p, to: v)
      }
    }
  }

  func getValueAsync() throws -> Promise<Double> {
    let inst = instance
    let p = prop
    return Promise.async {
      try await Double(inst.value(of: p))
    }
  }

  func addListener(onChanged: @escaping (Double) -> Void) throws -> () -> Void {
    let id = UUID()
    let task = Task { @MainActor [weak self] in
      guard let self else { return }
      // Emit current value immediately so the first subscription receives it
      let current = try? await self.instance.value(of: self.prop)
      if let current, !Task.isCancelled {
        onChanged(Double(current))
      }
      while !Task.isCancelled {
        let stream = self.instance.valueStream(of: self.prop)
        do {
          for try await val in stream {
            onChanged(Double(val))
          }
          break
        } catch {
          RCTLogWarn("[NumberProperty] listener stream interrupted: \(error), restarting")
          try? await Task.sleep(nanoseconds: 100_000_000)
        }
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
