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
    guard let instance = property.instance(at: Int(index)) else { return nil }
    return HybridViewModelInstance(viewModelInstance: instance)
  }

  func addInstance(instance: any HybridViewModelInstanceSpec) throws {
    guard let hybridInstance = instance as? HybridViewModelInstance,
          let viewModelInstance = hybridInstance.viewModelInstance else { return }
    property.addInstance(viewModelInstance)
  }

  func insertInstance(instance: any HybridViewModelInstanceSpec, index: Double) throws {
    guard let hybridInstance = instance as? HybridViewModelInstance,
          let viewModelInstance = hybridInstance.viewModelInstance else { return }
    _ = property.insertInstance(viewModelInstance, at: Int(index))
  }

  func removeInstance(instance: any HybridViewModelInstanceSpec) throws {
    guard let hybridInstance = instance as? HybridViewModelInstance,
          let viewModelInstance = hybridInstance.viewModelInstance else { return }
    property.removeInstance(viewModelInstance)
  }

  func removeInstanceAt(index: Double) throws {
    property.removeInstance(at: Int(index))
  }

  func swap(index1: Double, index2: Double) throws {
    property.swapInstance(at: Int(index1), withInstanceAt: Int(index2))
  }

  func addListener(onChanged: @escaping () -> Void) throws {
    try addListener(onChanged: { _ in onChanged() })
  }
}
