import RiveRuntime
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

  var propertyCount: Double {
    DeprecationWarning.warn("propertyCount", replacement: "getPropertyCountAsync")
    do {
      return Double(try blockingAsync { try await self.file.getProperties(of: self.vmName) }.count)
    } catch {
      RiveLog.e("ViewModel", "propertyCount failed: \(error)")
      return 0
    }
  }

  var instanceCount: Double {
    DeprecationWarning.warn("instanceCount", replacement: "getInstanceCountAsync")
    do {
      return Double(try blockingAsync { try await self.file.getInstanceNames(of: self.vmName) }.count)
    } catch {
      RiveLog.e("ViewModel", "instanceCount failed: \(error)")
      return 0
    }
  }

  func getPropertiesAsync() throws -> Promise<[ViewModelPropertyInfo]> {
    return Promise.async {
      let props = try await self.file.getProperties(of: self.vmName)
      return props.map { ViewModelPropertyInfo(name: $0.name, type: mapPropertyType($0.type)) }
    }
  }

  func getPropertyCountAsync() throws -> Promise<Double> {
    return Promise.async {
      Double(try await self.file.getProperties(of: self.vmName).count)
    }
  }

  func getInstanceCountAsync() throws -> Promise<Double> {
    return Promise.async {
      Double(try await self.file.getInstanceNames(of: self.vmName).count)
    }
  }

  private func createDefaultInstanceImpl() async throws -> (any HybridViewModelInstanceSpec)? {
    let vmi = try await self.file.createViewModelInstance(.viewModelDefault(from: .name(self.vmName)))
    return HybridViewModelInstance(viewModelInstance: vmi, worker: self.worker, file: self.file, vmName: self.vmName)
  }

  private func createInstanceByIndexImpl(index: Double) async throws -> (any HybridViewModelInstanceSpec)? {
    let names = try await self.file.getInstanceNames(of: self.vmName)
    let idx = Int(index)
    guard idx >= 0 && idx < names.count else { return nil }
    let name = names[idx]
    let vmi = try await self.file.createViewModelInstance(.name(name, from: .name(self.vmName)))
    return HybridViewModelInstance(viewModelInstance: vmi, worker: self.worker, instanceName: name, file: self.file, vmName: self.vmName)
  }

  // Deprecated: Use createInstanceByNameAsync instead
  func createInstanceByIndex(index: Double) throws -> (any HybridViewModelInstanceSpec)? {
    DeprecationWarning.warn("createInstanceByIndex", replacement: "createInstanceByNameAsync")
    return try blockingAsync { try await self.createInstanceByIndexImpl(index: index) }
  }

  private func createInstanceByNameImpl(name: String) async throws -> (any HybridViewModelInstanceSpec)? {
    let vmi = try await self.file.createViewModelInstance(.name(name, from: .name(self.vmName)))
    return HybridViewModelInstance(viewModelInstance: vmi, worker: self.worker, instanceName: name, file: self.file, vmName: self.vmName)
  }

  // Deprecated: Use createInstanceByNameAsync instead
  func createInstanceByName(name: String) throws -> (any HybridViewModelInstanceSpec)? {
    DeprecationWarning.warn("createInstanceByName", replacement: "createInstanceByNameAsync")
    return try blockingAsync { try await self.createInstanceByNameImpl(name: name) }
  }

  func createInstanceByNameAsync(name: String) throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async { try await self.createInstanceByNameImpl(name: name) }
  }

  // Deprecated: Use createDefaultInstanceAsync instead
  func createDefaultInstance() throws -> (any HybridViewModelInstanceSpec)? {
    DeprecationWarning.warn("createDefaultInstance", replacement: "createDefaultInstanceAsync")
    return try blockingAsync { try await self.createDefaultInstanceImpl() }
  }

  func createDefaultInstanceAsync() throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async { try await self.createDefaultInstanceImpl() }
  }

  private func createInstanceImpl() async throws -> (any HybridViewModelInstanceSpec)? {
    let vmi = try await self.file.createViewModelInstance(.blank(from: .name(self.vmName)))
    return HybridViewModelInstance(viewModelInstance: vmi, worker: self.worker, file: self.file, vmName: self.vmName)
  }

  // Deprecated: Use createBlankInstanceAsync instead
  func createInstance() throws -> (any HybridViewModelInstanceSpec)? {
    DeprecationWarning.warn("createInstance", replacement: "createBlankInstanceAsync")
    return try blockingAsync { try await self.createInstanceImpl() }
  }

  func createBlankInstanceAsync() throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async { try await self.createInstanceImpl() }
  }
}

func mapPropertyType(_ type: RiveRuntime.ViewModelProperty.DataType) -> ViewModelPropertyType {
  switch type {
  case .none: return .none
  case .string: return .string
  case .number: return .number
  case .boolean: return .boolean
  case .color: return .color
  case .list: return .list
  case .enum: return .enum
  case .trigger: return .trigger
  case .viewModel: return .viewmodel
  case .integer: return .integer
  case .symbolListIndex: return .symbollistindex
  case .assetImage: return .assetimage
  case .artboard: return .artboard
  case .input: return .input
  case .any: return .any
  @unknown default: return .none
  }
}
