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
    let artboard = try await self.file.createArtboard(nil)
    let vmInfo = try await self.file.getDefaultViewModelInfo(for: artboard)

    if vmInfo.viewModelName == self.vmName {
      let vmi = try await self.file.createViewModelInstance(.viewModelDefault(from: .artboardDefault(artboard)))
      return HybridViewModelInstance(viewModelInstance: vmi, worker: self.worker)
    }

    if !vmInfo.instanceName.isEmpty {
      do {
        let vmi = try await self.file.createViewModelInstance(.name(vmInfo.instanceName, from: .name(self.vmName)))
        return HybridViewModelInstance(viewModelInstance: vmi, worker: self.worker)
      } catch {
        // Named instance failed, fall through to blank
      }
    }

    let vmi = try await self.file.createViewModelInstance(.blank(from: .name(self.vmName)))
    return HybridViewModelInstance(viewModelInstance: vmi, worker: self.worker)
  }

  // Deprecated: Use createInstanceByIndexAsync instead
  func createInstanceByIndex(index: Double) throws -> (any HybridViewModelInstanceSpec)? {
    return try createDefaultInstance()
  }

  func createInstanceByIndexAsync(index: Double) throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async { try await self.createDefaultInstanceImpl() }
  }

  func createInstanceByName(name: String) throws -> (any HybridViewModelInstanceSpec)? {
    return try blockingAsync {
      let vmi = try await self.file.createViewModelInstance(.name(name, from: .name(self.vmName)))
      return HybridViewModelInstance(viewModelInstance: vmi, worker: self.worker)
    }
  }

  func createDefaultInstance() throws -> (any HybridViewModelInstanceSpec)? {
    return try blockingAsync { try await self.createDefaultInstanceImpl() }
  }

  func createInstance() throws -> (any HybridViewModelInstanceSpec)? {
    return try blockingAsync {
      let vmi = try await self.file.createViewModelInstance(.blank(from: .name(self.vmName)))
      return HybridViewModelInstance(viewModelInstance: vmi, worker: self.worker)
    }
  }
}
