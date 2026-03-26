import NitroModules
import RiveRuntime

class HybridViewModel: HybridViewModelSpec {
  let viewModel: RiveDataBindingViewModel?
  
  init(viewModel: RiveDataBindingViewModel) {
    self.viewModel = viewModel
  }

  var propertyCount: Double { Double(viewModel?.propertyCount ?? 0) }
  
  var instanceCount: Double { Double(viewModel?.instanceCount ?? 0) }
  
  var modelName: String { viewModel?.name ?? "" }
  
  // Deprecated: Use createInstanceByNameAsync instead
  func createInstanceByIndex(index: Double) throws -> (any HybridViewModelInstanceSpec)? {
    guard index >= 0, let viewModel = viewModel,
          let vmi = viewModel.createInstance(fromIndex: UInt(index)) else { return nil }
    return HybridViewModelInstance(viewModelInstance: vmi)
  }
  
  // Deprecated: Use createInstanceByNameAsync instead
  func createInstanceByName(name: String) throws -> (any HybridViewModelInstanceSpec)? {
    guard let viewModel = viewModel,
          let vmi = viewModel.createInstance(fromName: name) else { return nil }
    return HybridViewModelInstance(viewModelInstance: vmi)
  }

  func createInstanceByNameAsync(name: String) throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async {
      guard let viewModel = self.viewModel,
            let vmi = viewModel.createInstance(fromName: name) else { return nil }
      return HybridViewModelInstance(viewModelInstance: vmi)
    }
  }

  // Deprecated: Use createDefaultInstanceAsync instead
  func createDefaultInstance() throws -> (any HybridViewModelInstanceSpec)? {
    guard let viewModel = viewModel,
          let vmi = viewModel.createDefaultInstance() else {
      return nil
    }
    return HybridViewModelInstance(viewModelInstance: vmi)
  }

  func createDefaultInstanceAsync() throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async {
      guard let viewModel = self.viewModel,
            let vmi = viewModel.createDefaultInstance() else { return nil }
      return HybridViewModelInstance(viewModelInstance: vmi)
    }
  }

  // Deprecated: Use createInstanceAsync instead
  func createInstance() throws -> (any HybridViewModelInstanceSpec)? {
    guard let viewModel = viewModel,
          let vmi = viewModel.createInstance() else { return nil }
    return HybridViewModelInstance(viewModelInstance: vmi)
  }

  func getPropertyCountAsync() throws -> Promise<Double> {
    return Promise.async { self.propertyCount }
  }

  func getInstanceCountAsync() throws -> Promise<Double> {
    return Promise.async { self.instanceCount }
  }

  func createInstanceByNameAsync(name: String) throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async { try self.createInstanceByName(name: name) }
  }

  func createDefaultInstanceAsync() throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async { try self.createDefaultInstance() }
  }

  func createBlankInstanceAsync() throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async { try self.createInstance() }
  }
}
