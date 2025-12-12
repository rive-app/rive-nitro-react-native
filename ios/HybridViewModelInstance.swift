import RiveRuntime

class HybridViewModelInstance: HybridViewModelInstanceSpec {
  let viewModelInstance: RiveDataBindingViewModel.Instance?
  
  init(viewModelInstance: RiveDataBindingViewModel.Instance) {
    self.viewModelInstance = viewModelInstance
  }

  var instanceName: String { viewModelInstance?.name ?? "" }
  
  func numberProperty(path: String) throws -> (any HybridViewModelNumberPropertySpec)? {
    guard let property = viewModelInstance?.numberProperty(fromPath: path) else { return nil }
    return HybridViewModelNumberProperty(property: property)
  }
  
  func stringProperty(path: String) throws -> (any HybridViewModelStringPropertySpec)? {
    guard let property = viewModelInstance?.stringProperty(fromPath: path) else { return nil }
    return HybridViewModelStringProperty(property: property)
  }
  
  func booleanProperty(path: String) throws -> (any HybridViewModelBooleanPropertySpec)? {
    guard let property = viewModelInstance?.booleanProperty(fromPath: path) else { return nil }
    return HybridViewModelBooleanProperty(property: property)
  }
  
  func colorProperty(path: String) throws -> (any HybridViewModelColorPropertySpec)? {
    guard let property = viewModelInstance?.colorProperty(fromPath: path) else { return nil }
    return HybridViewModelColorProperty(property: property)
  }
  
  func enumProperty(path: String) throws -> (any HybridViewModelEnumPropertySpec)? {
    guard let property = viewModelInstance?.enumProperty(fromPath: path) else { return nil }
    return HybridViewModelEnumProperty(property: property)
  }
  
  func triggerProperty(path: String) throws -> (any HybridViewModelTriggerPropertySpec)? {
    guard let property = viewModelInstance?.triggerProperty(fromPath: path) else { return nil }
    return HybridViewModelTriggerProperty(property: property)
  }

  func imageProperty(path: String) throws -> (any HybridViewModelImagePropertySpec)? {
    guard let property = viewModelInstance?.imageProperty(fromPath: path) else { return nil }
    return HybridViewModelImageProperty(property: property)
  }

  func listProperty(path: String) throws -> (any HybridViewModelListPropertySpec)? {
    guard let property = viewModelInstance?.listProperty(fromPath: path) else { return nil }
    return HybridViewModelListProperty(property: property)
  }
}
