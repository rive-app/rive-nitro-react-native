import RiveRuntime

class HybridViewModelInstance: HybridViewModelInstanceSpec {
  let viewModelInstance: RiveDataBindingViewModel.Instance
  
  init(viewModelInstance: RiveDataBindingViewModel.Instance) {
    self.viewModelInstance = viewModelInstance
  }
  
  var name: String { "" }
}
