import RiveRuntime
import NitroModules

class HybridViewModelInstance: HybridViewModelInstanceSpec {
  let viewModelInstance: ViewModelInstance
  let worker: Worker
  private let _instanceName: String
  private let file: File?
  private let vmName: String?

  init(viewModelInstance: ViewModelInstance, worker: Worker, instanceName: String = "", file: File? = nil, vmName: String? = nil) {
    self.viewModelInstance = viewModelInstance
    self.worker = worker
    self._instanceName = instanceName
    self.file = file
    self.vmName = vmName
  }

  var instanceName: String { _instanceName }

  func getPropertiesAsync() throws -> Promise<[ViewModelPropertyInfo]> {
    guard let file = file, let vmName = vmName else { return Promise.resolved(withResult: []) }
    return Promise.async {
      let props = try await file.getProperties(of: vmName)
      return props.map { ViewModelPropertyInfo(name: $0.name, type: mapPropertyType($0.type)) }
    }
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
      RiveLog.e("ViewModelInstance", "viewModel(path: '\(path)') failed: \(error)")
      return nil
    }
  }

  // Deprecated: Use viewModelAsync instead
  func viewModel(path: String) throws -> (any HybridViewModelInstanceSpec)? {
    DeprecationWarning.warn("viewModel", replacement: "viewModelAsync")
    return try blockingAsync { try await self.viewModelImpl(path: path) }
  }

  func viewModelAsync(path: String) throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async { try await self.viewModelImpl(path: path) }
  }

  func replaceViewModel(path: String, instance: any HybridViewModelInstanceSpec) throws {
    DeprecationWarning.warn("ViewModelInstance.replaceViewModel", replacement: "replaceViewModelAsync")
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
