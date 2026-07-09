import RiveRuntime
import NitroModules

class HybridViewModelColorProperty: HybridViewModelColorPropertySpec {
  private let instance: ViewModelInstance
  private let prop: ColorProperty
  private let listeners = PropertyListenerStore()

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

  func setValueAsync(value: Double) throws -> Promise<Void> {
    let color = Color(UInt32(truncatingIfNeeded: Int64(value)))
    let inst = instance
    let p = prop
    return Promise.async { @MainActor in
      inst.setValue(of: p, to: color)
    }
  }

  func getValueAsync() throws -> Promise<Double> {
    return Promise.async { try await self.fetchColorValue() }
  }

  func addListener(onChanged: @escaping (Double) -> Void) throws -> () -> Void {
    // Capture the dependencies, not self: the infinite stream loop would
    // otherwise keep this wrapper alive until listeners are removed
    // explicitly, making the deinit cancelAll() safety net unreachable.
    let inst = instance
    let p = prop
    return listeners.register(Task { @MainActor in
      let current = try? await inst.value(of: p)
      if let current, !Task.isCancelled {
        onChanged(Double(current.argbValue))
      }
      while !Task.isCancelled {
        let stream = inst.valueStream(of: p)
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
    })
  }

  func removeListeners() throws { listeners.cancelAll() }
  func dispose() throws { listeners.cancelAll() }
  deinit { listeners.cancelAll() }
}
