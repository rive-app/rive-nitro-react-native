import RiveRuntime

class HybridViewModelInstance: HybridViewModelInstanceSpec {
  let viewModelInstance: RiveDataBindingViewModel.Instance?
  
  init(viewModelInstance: RiveDataBindingViewModel.Instance) {
    self.viewModelInstance = viewModelInstance
  }
  
  override init() {
    self.viewModelInstance = nil
    super.init()
  }
  
  var name: String { "" }
}
