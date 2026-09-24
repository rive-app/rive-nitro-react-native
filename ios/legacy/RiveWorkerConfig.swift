import Foundation

enum RiveWorkerConfig {
  private static let tag = "RiveWorkerConfig"

  static func setGPUCanvasEnabled(_ enabled: Bool) {
    if enabled {
      RiveLog.w(tag, "setGPUCanvasEnabled(true) ignored: the legacy backend does not support GPU Canvas.")
    }
  }

  static var isGPUCanvasEnabled: Bool { false }
}
