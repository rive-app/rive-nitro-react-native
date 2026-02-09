@_spi(RiveExperimental) import RiveRuntime
import NitroModules

class HybridViewModelStringProperty: HybridViewModelStringPropertySpec {
  private let instance: ViewModelInstance
  private let prop: StringProperty
  private var listenerTasks: [UUID: Task<Void, Never>] = [:]

  init(instance: ViewModelInstance, path: String) {
    self.instance = instance
    self.prop = StringProperty(path: path)
    super.init()
  }

  var value: String {
    get {
      do {
        return try blockingAsync { try await self.instance.value(of: self.prop) }
      } catch {
        RCTLogError("[StringProperty] getValue failed: \(error)")
        return ""
      }
    }
    set {
      let inst = instance
      let p = prop
      Task { @MainActor in
        inst.setValue(of: p, to: newValue)
      }
    }
  }

  func addListener(onChanged: @escaping (String) -> Void) throws -> () -> Void {
    let id = UUID()
    let task = Task { @MainActor [weak self] in
      guard let self else { return }
      while !Task.isCancelled {
        let stream = self.instance.valueStream(of: self.prop)
        do {
          for try await val in stream {
            onChanged(val)
          }
          break
        } catch {
          RCTLogWarn("[StringProperty] listener stream interrupted: \(error), restarting")
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
