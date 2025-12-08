import RiveRuntime

class HybridViewModel: HybridViewModelSpec {
  let viewModel: RiveDataBindingViewModel?
  
  init(viewModel: RiveDataBindingViewModel) {
    self.viewModel = viewModel
  }
  
  override init() {
    self.viewModel = nil
    super.init()
  }
  
  var propertyCount: Double { Double(viewModel?.propertyCount ?? 0) }
  
  var instanceCount: Double { Double(viewModel?.instanceCount ?? 0) }
  
  var modelName: String { viewModel?.name ?? "" }
  
  func createInstanceByIndex(index: Double) throws -> (any HybridViewModelInstanceSpec)? {
    guard let viewModel = viewModel,
          let vmi = viewModel.createInstance(fromIndex: UInt(index)) else { return nil }
    return HybridViewModelInstance(viewModelInstance: vmi)
  }
  
  func createInstanceByName(name: String) throws -> (any HybridViewModelInstanceSpec)? {
    guard let viewModel = viewModel,
          let vmi = viewModel.createInstance(fromName: name) else { return nil }
    return HybridViewModelInstance(viewModelInstance: vmi)
  }
  
  func createDefaultInstance() throws -> (any HybridViewModelInstanceSpec)? {
    guard let viewModel = viewModel,
          let vmi = viewModel.createDefaultInstance() else {
      return nil
    }
    return HybridViewModelInstance(viewModelInstance: vmi)
  }
  
  func createInstance() throws -> (any HybridViewModelInstanceSpec)? {
    guard let viewModel = viewModel,
          let vmi = viewModel.createInstance() else { return nil }
    return HybridViewModelInstance(viewModelInstance: vmi)
  }
}
