import RiveRuntime
import NitroModules

class HybridViewModelColorProperty: HybridViewModelColorPropertySpec {
  private let instance: ViewModelInstance
  private let prop: ColorProperty
  private var listenerTasks: [UUID: Task<Void, Never>] = [:]

  init(instance: ViewModelInstance, path: String) {
    self.instance = instance
    self.prop = ColorProperty(path: path)
    super.init()
  }

  private func fetchColorValue() async throws -> Double {
    let color = try await instance.value(of: prop)
    return Double(color.argbValue)
  }

  // Deprecated: Use getValueAsync (read) or set(value:) (write) instead
  var value: Double {
    get {
      DeprecationWarning.warn("ColorProperty.value", replacement: "getValueAsync")
      do {
        return try blockingAsync { try await self.fetchColorValue() }
      } catch {
        RiveLog.e("ColorProperty", "getValue failed: \(error)")
        return 0
      }
    }
    set { try? set(value: newValue) }
  }

  func set(value: Double) throws {
    let color = Color(UInt32(truncatingIfNeeded: Int64(value)))
    let inst = instance
    let p = prop
    Task { @MainActor in
      inst.setValue(of: p, to: color)
    }
  }

  func getValueAsync() throws -> Promise<Double> {
    return Promise.async { try await self.fetchColorValue() }
  }

  func addListener(onChanged: @escaping (Double) -> Void) throws -> () -> Void {
    let id = UUID()
    let task = Task { @MainActor [weak self] in
      guard let self else { return }
      let current = try? await self.instance.value(of: self.prop)
      if let current, !Task.isCancelled {
        onChanged(Double(current.argbValue))
      }
      while !Task.isCancelled {
        let stream = self.instance.valueStream(of: self.prop)
        do {
          for try await color in stream {
            onChanged(Double(color.argbValue))
          }
          break
        } catch {
          RCTLogWarn("[ColorProperty] listener stream interrupted: \(error), restarting")
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
