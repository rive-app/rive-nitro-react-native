import RiveRuntime

class HybridViewModelListProperty: HybridViewModelListPropertySpec, ValuedPropertyProtocol {
  var property: ListPropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)

  init(property: ListPropertyType) {
    self.property = property
    super.init()
  }

  override init() {
    super.init()
  }

  var length: Double {
    Double(property.count)
  }

  func instanceAt(index: Double) throws -> (any HybridViewModelInstanceSpec)? {
    guard let instance = property.instance(at: Int32(index)) else { return nil }
    return HybridViewModelInstance(viewModelInstance: instance)
  }

  private func requireViewModelInstance(_ instance: any HybridViewModelInstanceSpec) throws -> RiveDataBindingViewModel.Instance {
    guard let hybridInstance = instance as? HybridViewModelInstance,
          let viewModelInstance = hybridInstance.viewModelInstance else {
      throw NSError(domain: "HybridViewModelListProperty", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Expected HybridViewModelInstance with valid viewModelInstance"])
    }
    return viewModelInstance
  }

  func addInstance(instance: any HybridViewModelInstanceSpec) throws {
    let viewModelInstance = try requireViewModelInstance(instance)
    property.append(viewModelInstance)
  }

  func insertInstance(instance: any HybridViewModelInstanceSpec, index: Double) throws {
    let viewModelInstance = try requireViewModelInstance(instance)
    _ = property.insert(viewModelInstance, at: Int32(index))
  }

  func removeInstance(instance: any HybridViewModelInstanceSpec) throws {
    let viewModelInstance = try requireViewModelInstance(instance)
    property.remove(viewModelInstance)
  }

  func removeInstanceAt(index: Double) throws {
    property.remove(at: Int32(index))
  }

  func swap(index1: Double, index2: Double) throws {
    property.swap(at: UInt32(index1), with: UInt32(index2))
  }

  func addListener(onChanged: @escaping () -> Void) throws {
    try addListener(onChanged: { _ in onChanged() })
  }
}
