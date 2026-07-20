import NitroModules
import RiveRuntime

class HybridViewModelListProperty: HybridViewModelListPropertySpec, ValuedPropertyProtocol {
  var property: ListPropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)

  init(property: ListPropertyType) {
    self.property = property
    super.init()
  }

  var length: Double {
    MainThread.run { Double(property.count) }
  }

  func getInstanceAt(index: Double) throws -> (any HybridViewModelInstanceSpec)? {
    MainThread.run { () -> (any HybridViewModelInstanceSpec)? in
      guard let instance = property.instance(at: Int32(index)) else { return nil }
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
    MainThread.run { property.append(viewModelInstance) }
  }

  func addInstanceAt(instance: any HybridViewModelInstanceSpec, index: Double) throws -> Bool {
    let viewModelInstance = try requireViewModelInstance(instance)
    return MainThread.run { property.insert(viewModelInstance, at: Int32(index)) }
  }

  func removeInstance(instance: any HybridViewModelInstanceSpec) throws {
    let viewModelInstance = try requireViewModelInstance(instance)
    MainThread.run { property.remove(viewModelInstance) }
  }

  func removeInstanceAt(index: Double) throws {
    MainThread.run { property.remove(at: Int32(index)) }
  }

  func swap(index1: Double, index2: Double) throws -> Bool {
    MainThread.run {
      let idx1 = UInt32(index1)
      let idx2 = UInt32(index2)
      guard idx1 < property.count && idx2 < property.count else {
        return false
      }
      property.swap(at: idx1, with: idx2)
      return true
    }
  }

  func getLengthAsync() throws -> Promise<Double> {
    return Promise.onMain { self.length }
  }

  func getInstanceAtAsync(index: Double) throws -> Promise<(any HybridViewModelInstanceSpec)?> {
    return Promise.onMain { try self.getInstanceAt(index: index) }
  }

  func addInstanceAsync(instance: any HybridViewModelInstanceSpec) throws -> Promise<Void> {
    return Promise.onMain { try self.addInstance(instance: instance) }
  }

  func addInstanceAtAsync(instance: any HybridViewModelInstanceSpec, index: Double) throws -> Promise<Void> {
    return Promise.onMain { let _ = try self.addInstanceAt(instance: instance, index: index) }
  }

  func removeInstanceAsync(instance: any HybridViewModelInstanceSpec) throws -> Promise<Void> {
    return Promise.onMain { try self.removeInstance(instance: instance) }
  }

  func removeInstanceAtAsync(index: Double) throws -> Promise<Void> {
    return Promise.onMain { try self.removeInstanceAt(index: index) }
  }

  func swapAsync(index1: Double, index2: Double) throws -> Promise<Void> {
    return Promise.onMain { let _ = try self.swap(index1: index1, index2: index2) }
  }

  func addListener(onChanged: @escaping () -> Void) throws -> () -> Void {
    helper.addListener({ _ in onChanged() })
  }
}
