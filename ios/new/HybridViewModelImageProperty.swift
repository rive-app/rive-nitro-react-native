import RiveRuntime
import NitroModules

class HybridViewModelImageProperty: HybridViewModelImagePropertySpec {
  private typealias Write = @MainActor () async -> Void

  // Every image write runs to completion in call order, so a clear cannot overtake a pending decode.
  private static let writes: AsyncStream<Write>.Continuation = {
    let (stream, continuation) = AsyncStream.makeStream(of: Write.self)
    Task { @MainActor in
      for await write in stream { await write() }
    }
    return continuation
  }()

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
    _ = try setAsync(image: image).catch { error in
      RCTLogError("HybridViewModelImageProperty: Failed to decode/set image: \(error)")
    }
  }

  func setAsync(image: (any HybridRiveImageSpec)?) throws -> Promise<Void> {
    guard let instance = instance, let prop = prop, let worker = worker else {
      throw RuntimeError.error(withMessage: "ImageProperty not properly initialized")
    }
    var data: Data?
    if let image = image {
      guard let hybridImage = image as? HybridRiveImage else {
        throw RuntimeError.error(withMessage: "Invalid image type - expected HybridRiveImage")
      }
      data = hybridImage.rawData
    }

    let promise = Promise<Void>()
    Self.writes.yield { [data] in
      do {
        var decoded: Image?
        if let data = data {
          decoded = try await worker.decodeImage(from: data)
        }
        instance.setValue(of: prop, to: decoded)
        promise.resolve()
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  func addListener(onChanged: @escaping () -> Void) throws -> () -> Void {
    // TODO: image property listener not yet available in concurrency API
    return {}
  }

  func removeListeners() throws {}

  func dispose() throws {}

  deinit {}
}
