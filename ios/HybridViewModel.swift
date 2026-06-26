import NitroModules
import RiveRuntime

class HybridViewModel: HybridViewModelSpec {
  let viewModel: RiveDataBindingViewModel?

  init(viewModel: RiveDataBindingViewModel) {
    self.viewModel = viewModel
  }

  var propertyCount: Double { MainThread.run { Double(viewModel?.propertyCount ?? 0) } }

  var instanceCount: Double { MainThread.run { Double(viewModel?.instanceCount ?? 0) } }

  var modelName: String { MainThread.run { viewModel?.name ?? "" } }

  func createInstanceByIndex(index: Double) throws -> (any HybridViewModelInstanceSpec)? {
    MainThread.run { () -> (any HybridViewModelInstanceSpec)? in
      guard index >= 0 else { return nil }
      guard let viewModel = viewModel,
            let vmi = viewModel.createInstance(fromIndex: UInt(index)) else { return nil }
      return HybridViewModelInstance(viewModelInstance: vmi)
    }
  }

  func createInstanceByName(name: String) throws -> (any HybridViewModelInstanceSpec)? {
    MainThread.run { () -> (any HybridViewModelInstanceSpec)? in
      guard let viewModel = viewModel,
            let vmi = viewModel.createInstance(fromName: name) else { return nil }
      return HybridViewModelInstance(viewModelInstance: vmi)
    }
  }

  func createDefaultInstance() throws -> (any HybridViewModelInstanceSpec)? {
    MainThread.run { () -> (any HybridViewModelInstanceSpec)? in
      guard let viewModel = viewModel,
            let vmi = viewModel.createDefaultInstance() else {
        return nil
      }
      return HybridViewModelInstance(viewModelInstance: vmi)
    }
  }

  func createInstance() throws -> (any HybridViewModelInstanceSpec)? {
    MainThread.run { () -> (any HybridViewModelInstanceSpec)? in
      guard let viewModel = viewModel,
            let vmi = viewModel.createInstance() else { return nil }
      return HybridViewModelInstance(viewModelInstance: vmi)
    }
  }

  func getPropertyCountAsync() throws -> Promise<Double> {
    return Promise.onMain { self.propertyCount }
  }

  func getInstanceCountAsync() throws -> Promise<Double> {
    return Promise.onMain { self.instanceCount }
  }

  func createInstanceByNameAsync(name: String) throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.onMain { try self.createInstanceByName(name: name) }
  }

  func createDefaultInstanceAsync() throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.onMain { try self.createDefaultInstance() }
  }

  func createBlankInstanceAsync() throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.onMain { try self.createInstance() }
  }
}
