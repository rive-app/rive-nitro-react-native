@_spi(RiveExperimental) import RiveRuntime
import NitroModules

class HybridViewModel: HybridViewModelSpec {
  private let file: File
  private let vmName: String
  let worker: Worker

  init(file: File, vmName: String, worker: Worker) {
    self.file = file
    self.vmName = vmName
    self.worker = worker
  }

  var modelName: String { vmName }

  var propertyCount: Double { 0 }

  var instanceCount: Double { 0 }

  private func createDefaultInstanceImpl() async throws -> (any HybridViewModelInstanceSpec)? {
    let vmi = try await self.file.createViewModelInstance(.viewModelDefault(from: .name(self.vmName)))
    return HybridViewModelInstance(viewModelInstance: vmi, worker: self.worker)
  }

  private func createInstanceByIndexImpl(index: Double) async throws -> (any HybridViewModelInstanceSpec)? {
    let names = try await self.file.getInstanceNames(of: self.vmName)
    let idx = Int(index)
    guard idx >= 0 && idx < names.count else { return nil }
    let name = names[idx]
    let vmi = try await self.file.createViewModelInstance(.name(name, from: .name(self.vmName)))
    return HybridViewModelInstance(viewModelInstance: vmi, worker: self.worker, instanceName: name)
  }

  // Deprecated: Use createInstanceByIndexAsync instead
  func createInstanceByIndex(index: Double) throws -> (any HybridViewModelInstanceSpec)? {
    return try blockingAsync { try await self.createInstanceByIndexImpl(index: index) }
  }

  func createInstanceByIndexAsync(index: Double) throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async { try await self.createInstanceByIndexImpl(index: index) }
  }

  private func createInstanceByNameImpl(name: String) async throws -> (any HybridViewModelInstanceSpec)? {
    let vmi = try await self.file.createViewModelInstance(.name(name, from: .name(self.vmName)))
    return HybridViewModelInstance(viewModelInstance: vmi, worker: self.worker, instanceName: name)
  }

  // Deprecated: Use createInstanceByNameAsync instead
  func createInstanceByName(name: String) throws -> (any HybridViewModelInstanceSpec)? {
    return try blockingAsync { try await self.createInstanceByNameImpl(name: name) }
  }

  func createInstanceByNameAsync(name: String) throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async { try await self.createInstanceByNameImpl(name: name) }
  }

  // Deprecated: Use createDefaultInstanceAsync instead
  func createDefaultInstance() throws -> (any HybridViewModelInstanceSpec)? {
    return try blockingAsync { try await self.createDefaultInstanceImpl() }
  }

  func createDefaultInstanceAsync() throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async { try await self.createDefaultInstanceImpl() }
  }

  private func createInstanceImpl() async throws -> (any HybridViewModelInstanceSpec)? {
    let vmi = try await self.file.createViewModelInstance(.blank(from: .name(self.vmName)))
    return HybridViewModelInstance(viewModelInstance: vmi, worker: self.worker)
  }

  // Deprecated: Use createBlankInstanceAsync instead
  func createInstance() throws -> (any HybridViewModelInstanceSpec)? {
    return try blockingAsync { try await self.createInstanceImpl() }
  }

  func createBlankInstanceAsync() throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async { try await self.createInstanceImpl() }
  }
}
