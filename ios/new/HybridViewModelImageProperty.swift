import RiveRuntime
import NitroModules

class HybridViewModelImageProperty: HybridViewModelImagePropertySpec {
  private var instance: ViewModelInstance?
  private var prop: ImageProperty?
  private var worker: Worker?

  /// Bumped by every set(). Decoding is async, so a slow decode can finish after a later
  /// set() has already applied — the generation it captured lets it detect that and bail.
  @MainActor private var generation: UInt64 = 0

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
    guard let image = image else {
      Task { @MainActor in
        self.generation &+= 1
        instance.setValue(of: prop, to: nil)
      }
      return
    }
    guard let hybridImage = image as? HybridRiveImage else {
      throw RuntimeError.error(withMessage: "Invalid image type - expected HybridRiveImage")
    }

    Task { @MainActor in
      self.generation &+= 1
      let generation = self.generation
      do {
        let experimentalImage = try await worker.decodeImage(from: hybridImage.rawData)
        guard generation == self.generation else { return }
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
