@_spi(RiveExperimental) import RiveRuntime

/// Implements the Rive iOS SDK's `RiveLog.Logger` protocol and forwards all
/// C++ runtime logs through our bridge-level `RiveLog` utility, giving JS
/// visibility into file, artboard, state machine, and view model diagnostics.
final class RiveRuntimeLogger: RiveRuntime.RiveLog.Logger, @unchecked Sendable {
    func notice(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        RiveLog.i(tag.category, message())
    }

    func debug(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        RiveLog.d(tag.category, message())
    }

    func trace(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        RiveLog.d(tag.category, message())
    }

    func info(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        RiveLog.i(tag.category, message())
    }

    func error(tag: RiveRuntime.RiveLog.Tag, error: (any Error)?, _ message: @escaping () -> String) {
        let suffix = error.map { " (\($0.localizedDescription))" } ?? ""
        RiveLog.e(tag.category, "\(message())\(suffix)")
    }

    func warning(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        RiveLog.w(tag.category, message())
    }

    func fault(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        RiveLog.e(tag.category, message())
    }

    func critical(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        RiveLog.e(tag.category, message())
    }
}
