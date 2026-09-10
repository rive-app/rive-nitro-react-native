import Foundation
import RiveRuntime

/// Process-wide options for the shared render worker. They only take effect if
/// set before the worker is created (i.e. before the first Rive file is
/// loaded); later calls are logged and ignored.
enum RiveWorkerConfig {
  private static let tag = "RiveWorkerConfig"
  private static let lock = NSLock()
  private static var requestedGPUCanvas = false
  private static var resolvedGPUCanvas: Bool?

  static func setGPUCanvasEnabled(_ enabled: Bool) {
    lock.lock()
    defer { lock.unlock() }
    if let resolved = resolvedGPUCanvas {
      RiveLog.w(
        tag,
        "setGPUCanvasEnabled(\(enabled)) ignored: the shared render worker already exists "
          + "(GPU Canvas \(resolved ? "enabled" : "disabled")). Call it before loading any Rive files.")
      return
    }
    requestedGPUCanvas = enabled
  }

  static var isGPUCanvasEnabled: Bool {
    lock.lock()
    defer { lock.unlock() }
    return resolvedGPUCanvas ?? requestedGPUCanvas
  }

  static func resolveForWorker() -> Worker.Configuration {
    lock.lock()
    defer { lock.unlock() }
    let enabled = resolvedGPUCanvas ?? requestedGPUCanvas
    resolvedGPUCanvas = enabled
    return .init(enableGPUCanvas: enabled)
  }
}
