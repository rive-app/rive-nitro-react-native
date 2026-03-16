@_spi(RiveExperimental) import RiveRuntime
import NitroModules

class HybridViewModelListProperty: HybridViewModelListPropertySpec {
  private let vmiInstance: ViewModelInstance
  private let prop: ListProperty
  private let worker: Worker
  private var listenerTasks: [UUID: Task<Void, Never>] = [:]

  // Note: Experimental API doesn't validate property paths - non-existent properties
  // return garbage values instead of throwing. This is a known limitation.
  init(instance: ViewModelInstance, path: String, worker: Worker) {
    self.vmiInstance = instance
    self.prop = ListProperty(path: path)
    self.worker = worker
    super.init()
  }

  // Deprecated: Use getLengthAsync instead
  var length: Double {
    do {
      return try blockingAsync {
        try await Double(self.vmiInstance.size(of: self.prop))
      }
    } catch {
      RCTLogError("[ListProperty] length failed: \(error)")
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

  // Deprecated: Use getInstanceAtAsync instead
  func getInstanceAt(index: Double) throws -> (any HybridViewModelInstanceSpec)? {
    return try blockingAsync {
      let vmi = try await self.vmiInstance.value(of: self.prop, at: Int32(index))
      return HybridViewModelInstance(viewModelInstance: vmi, worker: self.worker)
    }
  }

  func getInstanceAtAsync(index: Double) throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    let inst = vmiInstance
    let p = prop
    let w = worker
    return Promise.async {
      let vmi = try await inst.value(of: p, at: Int32(index))
      return HybridViewModelInstance(viewModelInstance: vmi, worker: w)
    }
  }

  func addInstance(instance: any HybridViewModelInstanceSpec) throws {
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

  func addInstanceAt(instance: any HybridViewModelInstanceSpec, index: Double) throws -> Bool {
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

  func removeInstance(instance: any HybridViewModelInstanceSpec) throws {
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

  func removeInstanceAt(index: Double) throws {
    let inst = vmiInstance
    let p = prop
    let idx = Int32(index)
    Task { @MainActor in
      inst.removeInstance(at: idx, from: p)
    }
  }

  func swap(index1: Double, index2: Double) throws -> Bool {
    let inst = vmiInstance
    let p = prop
    let idx1 = Int32(index1)
    let idx2 = Int32(index2)
    Task { @MainActor in
      inst.swapInstance(atIndex: idx1, withIndex: idx2, in: p)
    }
    return true
  }

  func addListener(onChanged: @escaping () -> Void) throws -> () -> Void {
    // List change notifications may not be available in experimental API
    // Return empty cleanup function for now
    return {}
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
