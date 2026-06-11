import RiveRuntime
import NitroModules

class HybridViewModelEnumProperty: HybridViewModelEnumPropertySpec {
  private let instance: ViewModelInstance
  private let prop: EnumProperty
  private let listeners = PropertyListenerStore()

  init(instance: ViewModelInstance, path: String) {
    self.instance = instance
    self.prop = EnumProperty(path: path)
    super.init()
  }

  // Deprecated: Use getValueAsync (read) or set(value:) (write) instead
  var value: String {
    get {
      DeprecationWarning.warn("EnumProperty.value", replacement: "getValueAsync")
      do {
        return try blockingAsync { try await self.instance.value(of: self.prop) }
      } catch {
        RiveLog.e("EnumProperty", "getValue failed: \(error)")
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
    return listeners.register(Task { @MainActor [weak self] in
      guard let self else { return }
      let current = try? await self.instance.value(of: self.prop)
      if let current, !Task.isCancelled {
        onChanged(current)
      }
      while !Task.isCancelled {
        let stream = self.instance.valueStream(of: self.prop)
        do {
          for try await val in stream {
            onChanged(val)
          }
          break
        } catch {
          RCTLogWarn("[EnumProperty] listener stream interrupted: \(error), restarting")
          try? await Task.sleep(nanoseconds: 100_000_000)
        }
      }
    })
  }

  func removeListeners() throws { listeners.cancelAll() }
  func dispose() throws { listeners.cancelAll() }
  deinit { listeners.cancelAll() }
}
