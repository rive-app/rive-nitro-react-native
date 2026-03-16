import NitroModules
import RiveRuntime

class HybridViewModelListProperty: HybridViewModelListPropertySpec, ValuedPropertyProtocol {
  var property: ListPropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)

  init(property: ListPropertyType) {
    self.property = property
    super.init()
  }

  // Deprecated: Use getLengthAsync instead
  var length: Double {
    Double(property.count)
  }

  func getLengthAsync() throws -> Promise<Double> {
    return Promise.async { Double(self.property.count) }
  }

  // Deprecated: Use getInstanceAtAsync instead
  func getInstanceAt(index: Double) throws -> (any HybridViewModelInstanceSpec)? {
    guard let instance = property.instance(at: Int32(index)) else { return nil }
    return HybridViewModelInstance(viewModelInstance: instance)
  }

  func getInstanceAtAsync(index: Double) throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async {
      guard let instance = self.property.instance(at: Int32(index)) else { return nil }
      return HybridViewModelInstance(viewModelInstance: instance)
    }
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

  func addInstanceAt(instance: any HybridViewModelInstanceSpec, index: Double) throws -> Bool {
    let viewModelInstance = try requireViewModelInstance(instance)
    return property.insert(viewModelInstance, at: Int32(index))
  }

  func removeInstance(instance: any HybridViewModelInstanceSpec) throws {
    let viewModelInstance = try requireViewModelInstance(instance)
    property.remove(viewModelInstance)
  }

  func removeInstanceAt(index: Double) throws {
    property.remove(at: Int32(index))
  }

  func swap(index1: Double, index2: Double) throws -> Bool {
    let idx1 = UInt32(index1)
    let idx2 = UInt32(index2)
    guard idx1 < property.count && idx2 < property.count else {
      return false
    }
    property.swap(at: idx1, with: idx2)
    return true
  }

  func getLengthAsync() throws -> Promise<Double> {
    return Promise.async { self.length }
  }

  func getInstanceAtAsync(index: Double) throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.async { try self.getInstanceAt(index: index) }
  }

  func addInstanceAsync(instance: any HybridViewModelInstanceSpec) throws -> Promise<Void> {
    return Promise.async { try self.addInstance(instance: instance) }
  }

  func addInstanceAtAsync(instance: any HybridViewModelInstanceSpec, index: Double) throws -> Promise<Void> {
    return Promise.async { let _ = try self.addInstanceAt(instance: instance, index: index) }
  }

  func removeInstanceAsync(instance: any HybridViewModelInstanceSpec) throws -> Promise<Void> {
    return Promise.async { try self.removeInstance(instance: instance) }
  }

  func removeInstanceAtAsync(index: Double) throws -> Promise<Void> {
    return Promise.async { try self.removeInstanceAt(index: index) }
  }

  func swapAsync(index1: Double, index2: Double) throws -> Promise<Void> {
    return Promise.async { let _ = try self.swap(index1: index1, index2: index2) }
  }

  func addListener(onChanged: @escaping () -> Void) throws -> () -> Void {
    helper.addListener({ _ in onChanged() })
  }
}
