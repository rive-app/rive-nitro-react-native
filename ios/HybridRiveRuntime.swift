import NitroModules

final class HybridRiveRuntime: HybridRiveRuntimeSpec {
  var isInitialized: Bool { true }

  var initError: String? { nil }

  func initialize() throws -> Promise<Void> {
    return .resolved(with: ())
  }
}
