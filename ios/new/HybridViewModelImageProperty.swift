import RiveRuntime
import NitroModules

class HybridViewModelImageProperty: HybridViewModelImagePropertySpec {
  private var instance: ViewModelInstance?
  private var prop: ImageProperty?
  private var worker: Worker?
  init(instance: ViewModelInstance, path: String, worker: Worker) {
    self.instance = instance
    self.prop = ImageProperty(path: path)
    self.worker = worker
    super.init()
  }

  override init() {
    super.init()
  }

  func set(image: (any HybridRiveImageSpec)?) throws {
    guard let instance = instance, let prop = prop, let worker = worker else {
      throw RuntimeError.error(withMessage: "ImageProperty not properly initialized")
    }
    guard let hybridImage = image as? HybridRiveImage else {
      throw RuntimeError.error(withMessage: "Invalid image type - expected HybridRiveImage")
    }

    Task { @MainActor in
      do {
        let experimentalImage = try await worker.decodeImage(from: hybridImage.rawData)
        instance.setValue(of: prop, to: experimentalImage)
      } catch {
        RCTLogError("HybridViewModelImageProperty: Failed to decode/set image: \(error)")
      }
    }
  }

  func addListener(onChanged: @escaping () -> Void) throws -> () -> Void {
    // TODO: image property listener not yet available in concurrency API
    return {}
  }

  func removeListeners() throws {}

  func dispose() throws {}

  deinit {}
}
