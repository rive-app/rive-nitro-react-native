import RiveRuntime
import NitroModules

class HybridViewModelNumberProperty: HybridViewModelNumberPropertySpec {
  private let instance: ViewModelInstance
  private let prop: NumberProperty
  private let listeners = PropertyListenerStore()

  init(instance: ViewModelInstance, path: String) {
    self.instance = instance
    self.prop = NumberProperty(path: path)
    super.init()
  }

  // Deprecated: Use getValueAsync (read) or set(value:) (write) instead
  var value: Double {
    get {
      DeprecationWarning.warn("NumberProperty.value", replacement: "getValueAsync")
      do {
        return try blockingAsync { try await Double(self.instance.value(of: self.prop)) }
      } catch {
        RiveLog.e("NumberProperty", "getValue failed: \(error)")
        return 0
      }
    }
    set { try? set(value: newValue) }
  }

  func set(value: Double) throws {
    DeprecationWarning.warn("NumberProperty.set(value:)", replacement: "setValueAsync")
    let inst = instance
    let p = prop
    let v = Float(value)
    Task { @MainActor in
      inst.setValue(of: p, to: v)
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
    return listeners.register(Task { @MainActor [weak self] in
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
    })
  }

  func removeListeners() throws { listeners.cancelAll() }
  func dispose() throws { listeners.cancelAll() }
  deinit { listeners.cancelAll() }
}
