import RiveRuntime
import NitroModules

class HybridViewModelStringProperty: HybridViewModelStringPropertySpec {
  private let instance: ViewModelInstance
  private let prop: StringProperty
  private let listeners = PropertyListenerStore()

  init(instance: ViewModelInstance, path: String) {
    self.instance = instance
    self.prop = StringProperty(path: path)
    super.init()
  }

  // Deprecated: Use getValueAsync (read) or set(value:) (write) instead
  var value: String {
    get {
      DeprecationWarning.warn("StringProperty.value", replacement: "getValueAsync")
      do {
        return try blockingAsync { try await self.instance.value(of: self.prop) }
      } catch {
        RiveLog.e("StringProperty", "getValue failed: \(error)")
        return ""
      }
    }
    set { try? set(value: newValue) }
  }

  func set(value: String) throws {
    let inst = instance
    let p = prop
    Task { @MainActor in
      inst.setValue(of: p, to: value)
    }
  }

  func setValueAsync(value: String) throws -> Promise<Void> {
    let inst = instance
    let p = prop
    return Promise.async { @MainActor in
      inst.setValue(of: p, to: value)
    }
  }

  func getValueAsync() throws -> Promise<String> {
    let inst = instance
    let p = prop
    return Promise.async {
      try await inst.value(of: p)
    }
  }

  func addListener(onChanged: @escaping (String) -> Void) throws -> () -> Void {
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
          RCTLogWarn("[StringProperty] listener stream interrupted: \(error), restarting")
          try? await Task.sleep(nanoseconds: 100_000_000)
        }
      }
    })
  }

  func removeListeners() throws { listeners.cancelAll() }
  func dispose() throws { listeners.cancelAll() }
  deinit { listeners.cancelAll() }
}
