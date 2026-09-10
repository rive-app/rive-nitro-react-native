import NitroModules

final class HybridRiveRuntime: HybridRiveRuntimeSpec {
  var isInitialized: Bool { true }

  var initError: String? { nil }

  func initialize() throws -> Promise<Void> {
    return .resolved()
  }

  func setAndroidRenderBackend(backend: AndroidRenderBackend) throws {
    // Android-only setting; nothing to do on iOS.
  }

  var isGPUCanvasEnabled: Bool { RiveWorkerConfig.isGPUCanvasEnabled }

  func setGPUCanvasEnabled(enabled: Bool) throws {
    RiveWorkerConfig.setGPUCanvasEnabled(enabled)
  }
}
