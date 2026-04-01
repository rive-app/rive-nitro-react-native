@_spi(RiveExperimental) import RiveRuntime

private func tagName(_ tag: RiveRuntime.RiveLog.Tag) -> String {
    switch tag {
    case .rive: return "Rive"
    case .worker: return "Worker"
    case .file: return "File"
    case .artboard: return "Artboard"
    case .stateMachine: return "StateMachine"
    case .viewModelInstance: return "ViewModelInstance"
    case .image: return "Image"
    case .font: return "Font"
    case .audio: return "Audio"
    case .view: return "RiveUIView"
    case .custom(let name): return name
    @unknown default: return "Unknown"
    }
}

/// Implements the Rive iOS SDK's `RiveLog.Logger` protocol and forwards all
/// C++ runtime logs through our bridge-level `RiveLog` utility, giving JS
/// visibility into file, artboard, state machine, and view model diagnostics.
final class RiveRuntimeLogger: RiveRuntime.RiveLog.Logger, @unchecked Sendable {
    func notice(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        RiveLog.i(tagName(tag), message())
    }

    func debug(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        RiveLog.d(tagName(tag), message())
    }

    func trace(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        RiveLog.d(tagName(tag), message())
    }

    func info(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        RiveLog.i(tagName(tag), message())
    }

    func error(tag: RiveRuntime.RiveLog.Tag, error: (any Error)?, _ message: @escaping () -> String) {
        let suffix = error.map { " (\($0.localizedDescription))" } ?? ""
        RiveLog.e(tagName(tag), "\(message())\(suffix)")
    }

    func warning(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        RiveLog.w(tagName(tag), message())
    }

    func fault(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        RiveLog.e(tagName(tag), message())
    }

    func critical(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        RiveLog.e(tagName(tag), message())
    }
}
