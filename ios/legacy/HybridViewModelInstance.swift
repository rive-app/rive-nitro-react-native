import NitroModules
import RiveRuntime

class HybridViewModelInstance: HybridViewModelInstanceSpec {
  let viewModelInstance: RiveDataBindingViewModel.Instance?

  init(viewModelInstance: RiveDataBindingViewModel.Instance) {
    self.viewModelInstance = viewModelInstance
  }

  var instanceName: String { MainThread.run { viewModelInstance?.name ?? "" } }

  func getPropertiesAsync() throws -> Promise<[ViewModelPropertyInfo]> {
    throw RuntimeError.error(withMessage: "getPropertiesAsync is not supported on the legacy backend")
  }

  func numberProperty(path: String) throws -> (any HybridViewModelNumberPropertySpec)? {
    MainThread.run { () -> (any HybridViewModelNumberPropertySpec)? in
      guard let property = viewModelInstance?.numberProperty(fromPath: path) else { return nil }
      return HybridViewModelNumberProperty(property: property)
    }
  }

  func stringProperty(path: String) throws -> (any HybridViewModelStringPropertySpec)? {
    MainThread.run { () -> (any HybridViewModelStringPropertySpec)? in
      guard let property = viewModelInstance?.stringProperty(fromPath: path) else { return nil }
      return HybridViewModelStringProperty(property: property)
    }
  }

  func booleanProperty(path: String) throws -> (any HybridViewModelBooleanPropertySpec)? {
    MainThread.run { () -> (any HybridViewModelBooleanPropertySpec)? in
      guard let property = viewModelInstance?.booleanProperty(fromPath: path) else { return nil }
      return HybridViewModelBooleanProperty(property: property)
    }
  }

  func colorProperty(path: String) throws -> (any HybridViewModelColorPropertySpec)? {
    MainThread.run { () -> (any HybridViewModelColorPropertySpec)? in
      guard let property = viewModelInstance?.colorProperty(fromPath: path) else { return nil }
      return HybridViewModelColorProperty(property: property)
    }
  }

  func enumProperty(path: String) throws -> (any HybridViewModelEnumPropertySpec)? {
    MainThread.run { () -> (any HybridViewModelEnumPropertySpec)? in
      guard let property = viewModelInstance?.enumProperty(fromPath: path) else { return nil }
      return HybridViewModelEnumProperty(property: property)
    }
  }

  func triggerProperty(path: String) throws -> (any HybridViewModelTriggerPropertySpec)? {
    MainThread.run { () -> (any HybridViewModelTriggerPropertySpec)? in
      guard let property = viewModelInstance?.triggerProperty(fromPath: path) else { return nil }
      return HybridViewModelTriggerProperty(property: property)
    }
  }

  func imageProperty(path: String) throws -> (any HybridViewModelImagePropertySpec)? {
    MainThread.run { () -> (any HybridViewModelImagePropertySpec)? in
      guard let property = viewModelInstance?.imageProperty(fromPath: path) else { return nil }
      return HybridViewModelImageProperty(property: property)
    }
  }

  func listProperty(path: String) throws -> (any HybridViewModelListPropertySpec)? {
    MainThread.run { () -> (any HybridViewModelListPropertySpec)? in
      guard let property = viewModelInstance?.listProperty(fromPath: path) else { return nil }
      return HybridViewModelListProperty(property: property)
    }
  }

  func artboardProperty(path: String) throws -> (any HybridViewModelArtboardPropertySpec)? {
    MainThread.run { () -> (any HybridViewModelArtboardPropertySpec)? in
      guard let property = viewModelInstance?.artboardProperty(fromPath: path) else { return nil }
      return HybridViewModelArtboardProperty(property: property)
    }
  }

  func viewModel(path: String) throws -> (any HybridViewModelInstanceSpec)? {
    MainThread.run { () -> (any HybridViewModelInstanceSpec)? in
      guard let instance = viewModelInstance?.viewModelInstanceProperty(fromPath: path) else { return nil }
      return HybridViewModelInstance(viewModelInstance: instance)
    }
  }

  func replaceViewModel(path: String, instance: any HybridViewModelInstanceSpec) throws {
    guard let hybridInstance = instance as? HybridViewModelInstance,
          let nativeInstance = hybridInstance.viewModelInstance else {
      throw RuntimeError.error(withMessage: "Invalid ViewModelInstance provided to replaceViewModel")
    }
    let success = MainThread.run {
      viewModelInstance?.setViewModelInstanceProperty(fromPath: path, to: nativeInstance) ?? false
    }
    if !success {
      throw RuntimeError.error(withMessage: "Failed to replace ViewModel at path: \(path)")
    }
  }

  func viewModelAsync(path: String) throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.onMain { try self.viewModel(path: path) }
  }
}
