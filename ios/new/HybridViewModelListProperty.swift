import RiveRuntime
import NitroModules

class HybridViewModelListProperty: HybridViewModelListPropertySpec {
  private let vmiInstance: ViewModelInstance
  private let prop: ListProperty
  private let worker: Worker
  // Note: the concurrency API doesn't validate property paths — non-existent
  // properties return garbage values instead of throwing.
  init(instance: ViewModelInstance, path: String, worker: Worker) {
    self.vmiInstance = instance
    self.prop = ListProperty(path: path)
    self.worker = worker
    super.init()
  }

  // Deprecated: Use getLengthAsync instead
  var length: Double {
    DeprecationWarning.warn("ListProperty.length", replacement: "getLengthAsync")
    do {
      return try blockingAsync {
        try await Double(self.vmiInstance.size(of: self.prop))
      }
    } catch {
      RiveLog.e("ListProperty", "length failed: \(error)")
      return 0
    }
  }

  func getLengthAsync() throws -> Promise<Double> {
    let inst = vmiInstance
    let p = prop
    return Promise.async {
      try await Double(inst.size(of: p))
    }
  }

  private func requireIndexInBounds(_ index: Int32, allowEnd: Bool = false) async throws {
    let size = try await Int32(vmiInstance.size(of: prop))
    let max = allowEnd ? size : size - 1
    if index < 0 || index > max {
      throw RuntimeError.error(
        withMessage: "index \(index) out of bounds for list of size \(size)")
    }
  }

  private func fetchInstance(at index: Double) async throws -> (any HybridViewModelInstanceSpec)? {
    // The command server hands out a handle for any index — probe the size
    // so out-of-range lookups return nil like the legacy backend.
    let idx = Int32(index)
    let size = try await Int32(vmiInstance.size(of: prop))
    if idx < 0 || idx >= size { return nil }
    let vmi = try await vmiInstance.value(of: prop, at: idx)
    return HybridViewModelInstance(viewModelInstance: vmi, worker: worker)
  }

  // Deprecated: Use getInstanceAtAsync instead
  func getInstanceAt(index: Double) throws -> (any HybridViewModelInstanceSpec)? {
    DeprecationWarning.warn("ListProperty.getInstanceAt", replacement: "getInstanceAtAsync")
    return try blockingAsync { try await self.fetchInstance(at: index) }
  }

  func getInstanceAtAsync(index: Double) throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async { try await self.fetchInstance(at: index) }
  }

  // Deprecated: Use addInstanceAsync instead
  func addInstance(instance: any HybridViewModelInstanceSpec) throws {
    DeprecationWarning.warn("ListProperty.addInstance", replacement: "addInstanceAsync")
    guard let hybridInstance = instance as? HybridViewModelInstance else {
      throw RuntimeError.error(withMessage: "Expected HybridViewModelInstance")
    }
    let vmi = hybridInstance.viewModelInstance
    let inst = vmiInstance
    let p = prop
    Task { @MainActor in
      inst.appendInstance(vmi, to: p)
    }
  }

  // Deprecated: Use addInstanceAtAsync instead
  func addInstanceAt(instance: any HybridViewModelInstanceSpec, index: Double) throws -> Bool {
    DeprecationWarning.warn("ListProperty.addInstanceAt", replacement: "addInstanceAtAsync")
    guard let hybridInstance = instance as? HybridViewModelInstance else {
      throw RuntimeError.error(withMessage: "Expected HybridViewModelInstance")
    }
    let vmi = hybridInstance.viewModelInstance
    let inst = vmiInstance
    let p = prop
    let idx = Int32(index)
    Task { @MainActor in
      inst.insertInstance(vmi, to: p, at: idx)
    }
    return true
  }

  // Deprecated: Use removeInstanceAsync instead
  func removeInstance(instance: any HybridViewModelInstanceSpec) throws {
    DeprecationWarning.warn("ListProperty.removeInstance", replacement: "removeInstanceAsync")
    guard let hybridInstance = instance as? HybridViewModelInstance else {
      throw RuntimeError.error(withMessage: "Expected HybridViewModelInstance")
    }
    let vmi = hybridInstance.viewModelInstance
    let inst = vmiInstance
    let p = prop
    Task { @MainActor in
      inst.removeInstance(vmi, from: p)
    }
  }

  // Deprecated: Use removeInstanceAtAsync instead
  func removeInstanceAt(index: Double) throws {
    DeprecationWarning.warn("ListProperty.removeInstanceAt", replacement: "removeInstanceAtAsync")
    let inst = vmiInstance
    let p = prop
    let idx = Int32(index)
    Task { @MainActor in
      inst.removeInstance(at: idx, from: p)
    }
  }

  // Deprecated: Use swapAsync instead
  func swap(index1: Double, index2: Double) throws -> Bool {
    DeprecationWarning.warn("ListProperty.swap", replacement: "swapAsync")
    let inst = vmiInstance
    let p = prop
    let idx1 = Int32(index1)
    let idx2 = Int32(index2)
    Task { @MainActor in
      inst.swapInstance(atIndex: idx1, withIndex: idx2, in: p)
    }
    return true
  }

  func addInstanceAsync(instance: any HybridViewModelInstanceSpec) throws -> Promise<Void> {
    guard let hybridInstance = instance as? HybridViewModelInstance else {
      throw RuntimeError.error(withMessage: "Expected HybridViewModelInstance")
    }
    let vmi = hybridInstance.viewModelInstance
    let inst = vmiInstance
    let p = prop
    return Promise.async { @MainActor in
      inst.appendInstance(vmi, to: p)
    }
  }

  func addInstanceAtAsync(instance: any HybridViewModelInstanceSpec, index: Double) throws -> Promise<Void> {
    guard let hybridInstance = instance as? HybridViewModelInstance else {
      throw RuntimeError.error(withMessage: "Expected HybridViewModelInstance")
    }
    let vmi = hybridInstance.viewModelInstance
    let inst = vmiInstance
    let p = prop
    let idx = Int32(index)
    return Promise.async { @MainActor in
      try await self.requireIndexInBounds(idx, allowEnd: true)
      inst.insertInstance(vmi, to: p, at: idx)
    }
  }

  func removeInstanceAsync(instance: any HybridViewModelInstanceSpec) throws -> Promise<Void> {
    guard let hybridInstance = instance as? HybridViewModelInstance else {
      throw RuntimeError.error(withMessage: "Expected HybridViewModelInstance")
    }
    let vmi = hybridInstance.viewModelInstance
    let inst = vmiInstance
    let p = prop
    return Promise.async { @MainActor in
      inst.removeInstance(vmi, from: p)
    }
  }

  func removeInstanceAtAsync(index: Double) throws -> Promise<Void> {
    let inst = vmiInstance
    let p = prop
    let idx = Int32(index)
    return Promise.async { @MainActor in
      try await self.requireIndexInBounds(idx)
      inst.removeInstance(at: idx, from: p)
    }
  }

  func swapAsync(index1: Double, index2: Double) throws -> Promise<Void> {
    let inst = vmiInstance
    let p = prop
    let idx1 = Int32(index1)
    let idx2 = Int32(index2)
    return Promise.async { @MainActor in
      try await self.requireIndexInBounds(idx1)
      try await self.requireIndexInBounds(idx2)
      inst.swapInstance(atIndex: idx1, withIndex: idx2, in: p)
    }
  }

  func addListener(onChanged: @escaping () -> Void) throws -> () -> Void {
    // List change notifications may not be available in experimental API
    // Return empty cleanup function for now
    return {}
  }

  func removeListeners() throws {}

  func dispose() throws {}

  deinit {}
}
