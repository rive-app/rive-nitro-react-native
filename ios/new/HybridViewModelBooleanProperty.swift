import RiveRuntime
import NitroModules

class HybridViewModelBooleanProperty: HybridViewModelBooleanPropertySpec {
  private let instance: ViewModelInstance
  private let prop: BoolProperty
  private let listeners = PropertyListenerStore()

  init(instance: ViewModelInstance, path: String) {
    self.instance = instance
    self.prop = BoolProperty(path: path)
    super.init()
  }

  // Deprecated: Use getValueAsync (read) or set(value:) (write) instead
  var value: Bool {
    get {
      DeprecationWarning.warn("BooleanProperty.value", replacement: "getValueAsync")
      do {
        return try blockingAsync { try await self.instance.value(of: self.prop) }
      } catch {
        RiveLog.e("BooleanProperty", "getValue failed: \(error)")
        return false
      }
    }
    set { try? set(value: newValue) }
  }

  func set(value: Bool) throws {
    let inst = instance
    let p = prop
    Task { @MainActor in
      inst.setValue(of: p, to: value)
    }
  }

  func setValueAsync(value: Bool) throws -> Promise<Void> {
    let inst = instance
    let p = prop
    return Promise.async { @MainActor in
      inst.setValue(of: p, to: value)
    }
  }

  func getValueAsync() throws -> Promise<Bool> {
    let inst = instance
    let p = prop
    return Promise.async {
      try await inst.value(of: p)
    }
  }

  func addListener(onChanged: @escaping (Bool) -> Void) throws -> () -> Void {
    // Capture the dependencies, not self: the infinite stream loop would
    // otherwise keep this wrapper alive until listeners are removed
    // explicitly, making the deinit cancelAll() safety net unreachable.
    let inst = instance
    let p = prop
    return listeners.register(Task { @MainActor in
      let current = try? await inst.value(of: p)
      if let current, !Task.isCancelled {
        onChanged(current)
      }
      while !Task.isCancelled {
        let stream = inst.valueStream(of: p)
        do {
          for try await val in stream {
            onChanged(val)
          }
          break
        } catch {
          RCTLogWarn("[BooleanProperty] listener stream interrupted: \(error), restarting")
          try? await Task.sleep(nanoseconds: 100_000_000)
        }
      }
    })
  }

  func removeListeners() throws { listeners.cancelAll() }
  func dispose() throws { listeners.cancelAll() }
  deinit { listeners.cancelAll() }
}
