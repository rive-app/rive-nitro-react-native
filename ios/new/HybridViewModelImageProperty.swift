import RiveRuntime
import NitroModules

// Shared by every wrapper for one instance path, since JS may look the property up again per set.
final class ImagePropertySequencer {
  private let lock = NSLock()
  private var generation: UInt64 = 0

  func next() -> UInt64 {
    lock.lock()
    defer { lock.unlock() }
    generation &+= 1
    return generation
  }

  // Decoding suspends, so a decode that finishes after a newer set or clear must be dropped.
  func isCurrent(_ candidate: UInt64) -> Bool {
    lock.lock()
    defer { lock.unlock() }
    return generation == candidate
  }
}

class HybridViewModelImageProperty: HybridViewModelImagePropertySpec {
  private var instance: ViewModelInstance?
  private var prop: ImageProperty?
  private var worker: Worker?
  private var sequencer: ImagePropertySequencer?
  init(instance: ViewModelInstance, path: String, worker: Worker, sequencer: ImagePropertySequencer) {
    self.instance = instance
    self.prop = ImageProperty(path: path)
    self.worker = worker
    self.sequencer = sequencer
    super.init()
  }

  override init() {
    super.init()
  }

  func set(image: (any HybridRiveImageSpec)?) throws {
    let applied = try applyImage(image)
    Task {
      do {
        try await applied.value
      } catch {
        RCTLogError("HybridViewModelImageProperty: Failed to decode/set image: \(error)")
      }
    }
  }

  func setAsync(image: (any HybridRiveImageSpec)?) throws -> Promise<Void> {
    let applied = try applyImage(image)
    return Promise.async { try await applied.value }
  }

  private func applyImage(_ image: (any HybridRiveImageSpec)?) throws -> Task<Void, Error> {
    guard let instance = instance, let prop = prop, let worker = worker, let sequencer = sequencer else {
      throw RuntimeError.error(withMessage: "ImageProperty not properly initialized")
    }
    var hybridImage: HybridRiveImage?
    if let image = image {
      guard let validImage = image as? HybridRiveImage else {
        throw RuntimeError.error(withMessage: "Invalid image type - expected HybridRiveImage")
      }
      hybridImage = validImage
    }

    let generation = sequencer.next()
    return Task { @MainActor [hybridImage] in
      do {
        var decoded: Image?
        if let hybridImage = hybridImage {
          decoded = try await worker.decodeImage(from: hybridImage.rawData)
        }
        if sequencer.isCurrent(generation) {
          instance.setValue(of: prop, to: decoded)
        }
      } catch where !sequencer.isCurrent(generation) {
        RCTLogWarn("HybridViewModelImageProperty: Ignoring failure of superseded image: \(error)")
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
