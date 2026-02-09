@_spi(RiveExperimental) import RiveRuntime
import NitroModules

class HybridViewModelColorProperty: HybridViewModelColorPropertySpec {
  private let instance: ViewModelInstance
  private let prop: ColorProperty
  private var listenerTasks: [UUID: Task<Void, Never>] = [:]

  // Note: Color.argbValue is internal in rive-ios, so get value throws.
  // setValue() works, but reading colors back is not possible.
  // TODO: File issue with rive-ios to expose Color.argbValue in SPI

  init(instance: ViewModelInstance, path: String) {
    self.instance = instance
    self.prop = ColorProperty(path: path)
    super.init()
  }

  var value: Double {
    get {
      RCTLogError("[ColorProperty] getValue not supported - rive-ios Color.argbValue is internal")
      return 0
    }
    set {
      let color = Color(UInt32(newValue))
      let inst = instance
      let p = prop
      Task { @MainActor in
        inst.setValue(of: p, to: color)
      }
    }
  }

  func addListener(onChanged: @escaping (Double) -> Void) throws -> () -> Void {
    throw RuntimeError.error(withMessage: "Color addListener() not supported - rive-ios Color.argbValue is internal")
  }

  func removeListeners() throws {
    listenerTasks.values.forEach { $0.cancel() }
    listenerTasks.removeAll()
  }

  func dispose() throws {
    try removeListeners()
  }

  deinit {
    listenerTasks.values.forEach { $0.cancel() }
  }
}
