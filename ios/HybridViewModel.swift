import RiveRuntime

extension ViewModelPropertyType {
  init(from type: RiveDataBindingViewModel.Instance.Property.Data.DataType) {
    switch type {
    case .none: self = .none
    case .string: self = .string
    case .number: self = .number
    case .boolean: self = .boolean
    case .color: self = .color
    case .list: self = .list
    case .enum: self = .enum
    case .trigger: self = .trigger
    case .viewModel: self = .viewmodel
    case .integer: self = .integer
    case .symbolListIndex: self = .symbollistindex
    case .assetImage: self = .assetimage
    case .artboard: self = .artboard
    case .input: self = .input
    case .any: self = .any
    @unknown default: self = .none
    }
  }
}

class HybridViewModel: HybridViewModelSpec {
  let viewModel: RiveDataBindingViewModel?

  init(viewModel: RiveDataBindingViewModel) {
    self.viewModel = viewModel
  }

  var propertyCount: Double { Double(viewModel?.propertyCount ?? 0) }

  var instanceCount: Double { Double(viewModel?.instanceCount ?? 0) }

  var modelName: String { viewModel?.name ?? "" }

  var properties: [ViewModelPropertyInfo] {
    guard let vm = viewModel else { return [] }
    return vm.properties.map { prop in
      ViewModelPropertyInfo(
        name: prop.name,
        type: ViewModelPropertyType(from: prop.type)
      )
    }
  }

  
  func createInstanceByIndex(index: Double) throws -> (any HybridViewModelInstanceSpec)? {
    guard let viewModel = viewModel,
          let vmi = viewModel.createInstance(fromIndex: UInt(index)) else { return nil }
    return HybridViewModelInstance(viewModelInstance: vmi)
  }
  
  func createInstanceByName(name: String) throws -> (any HybridViewModelInstanceSpec)? {
    guard let viewModel = viewModel,
          let vmi = viewModel.createInstance(fromName: name) else { return nil }
    return HybridViewModelInstance(viewModelInstance: vmi)
  }
  
  func createDefaultInstance() throws -> (any HybridViewModelInstanceSpec)? {
    guard let viewModel = viewModel,
          let vmi = viewModel.createDefaultInstance() else {
      return nil
    }
    return HybridViewModelInstance(viewModelInstance: vmi)
  }
  
  func createInstance() throws -> (any HybridViewModelInstanceSpec)? {
    guard let viewModel = viewModel,
          let vmi = viewModel.createInstance() else { return nil }
    return HybridViewModelInstance(viewModelInstance: vmi)
  }
}
