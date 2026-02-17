@_spi(RiveExperimental) import RiveRuntime
import NitroModules

class HybridViewModelInstance: HybridViewModelInstanceSpec {
  let viewModelInstance: ViewModelInstance
  let worker: Worker

  init(viewModelInstance: ViewModelInstance, worker: Worker) {
    self.viewModelInstance = viewModelInstance
    self.worker = worker
  }

  var instanceName: String {
    // TODO: Experimental API - ViewModelInstance.name may have been removed
    ""
  }

  // Note: Unlike legacy API, experimental API can't sync-validate if property exists
  // Non-existent properties return wrapper objects that fail on getValue()
  // This is a known limitation documented in EXPERIMENTAL_IOS_API.md

  func numberProperty(path: String) throws -> (any HybridViewModelNumberPropertySpec)? {
    return HybridViewModelNumberProperty(instance: viewModelInstance, path: path)
  }

  func stringProperty(path: String) throws -> (any HybridViewModelStringPropertySpec)? {
    return HybridViewModelStringProperty(instance: viewModelInstance, path: path)
  }

  func booleanProperty(path: String) throws -> (any HybridViewModelBooleanPropertySpec)? {
    return HybridViewModelBooleanProperty(instance: viewModelInstance, path: path)
  }

  func colorProperty(path: String) throws -> (any HybridViewModelColorPropertySpec)? {
    return HybridViewModelColorProperty(instance: viewModelInstance, path: path)
  }

  func enumProperty(path: String) throws -> (any HybridViewModelEnumPropertySpec)? {
    return HybridViewModelEnumProperty(instance: viewModelInstance, path: path)
  }

  func triggerProperty(path: String) throws -> (any HybridViewModelTriggerPropertySpec)? {
    return HybridViewModelTriggerProperty(instance: viewModelInstance, path: path)
  }

  func imageProperty(path: String) throws -> (any HybridViewModelImagePropertySpec)? {
    return HybridViewModelImageProperty(instance: viewModelInstance, path: path, worker: worker)
  }

  func listProperty(path: String) throws -> (any HybridViewModelListPropertySpec)? {
    return HybridViewModelListProperty(instance: viewModelInstance, path: path, worker: worker)
  }

  func artboardProperty(path: String) throws -> (any HybridViewModelArtboardPropertySpec)? {
    return HybridViewModelArtboardProperty(instance: viewModelInstance, path: path)
  }

  private func viewModelImpl(path: String) async throws -> (any HybridViewModelInstanceSpec)? {
    let prop = ViewModelInstanceProperty(path: path)
    do {
      let vmi = try await self.viewModelInstance.value(of: prop)
      return HybridViewModelInstance(viewModelInstance: vmi, worker: self.worker)
    } catch {
      RCTLogError("[ViewModelInstance] viewModel(path: '\(path)') failed: \(error)")
      return nil
    }
  }

  // Deprecated: Use viewModelAsync instead
  func viewModel(path: String) throws -> (any HybridViewModelInstanceSpec)? {
    return try blockingAsync { try await self.viewModelImpl(path: path) }
  }

  func viewModelAsync(path: String) throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async { try await self.viewModelImpl(path: path) }
  }

  func replaceViewModel(path: String, instance: any HybridViewModelInstanceSpec) throws {
    guard let hybridInstance = instance as? HybridViewModelInstance else {
      throw RuntimeError.error(withMessage: "Invalid ViewModelInstance provided to replaceViewModel")
    }
    let prop = ViewModelInstanceProperty(path: path)
    let vmi = hybridInstance.viewModelInstance
    let inst = viewModelInstance
    Task { @MainActor in
      inst.setValue(of: prop, to: vmi)
    }
  }
}
