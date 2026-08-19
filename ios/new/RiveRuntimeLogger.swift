import RiveRuntime

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

/// The SDK hardcodes the tag name into its message strings (e.g. "[RiveUIView]
/// Draw failed…") in addition to passing `tag:`, so prepending the tag again in
/// `RiveLog` would print it twice.
private func stripTagPrefix(_ message: String, tag: String) -> String {
    let prefix = "[\(tag)] "
    guard message.hasPrefix(prefix) else { return message }
    return String(message.dropFirst(prefix.count))
}

/// Implements the Rive iOS SDK's `RiveLog.Logger` protocol and forwards all
/// C++ runtime logs through our bridge-level `RiveLog` utility, giving JS
/// visibility into file, artboard, state machine, and view model diagnostics.
final class RiveRuntimeLogger: RiveRuntime.RiveLog.Logger, @unchecked Sendable {
    func notice(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        let name = tagName(tag)
        RiveLog.i(name, stripTagPrefix(message(), tag: name))
    }

    func debug(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        let name = tagName(tag)
        RiveLog.d(name, stripTagPrefix(message(), tag: name))
    }

    func trace(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        let name = tagName(tag)
        RiveLog.d(name, stripTagPrefix(message(), tag: name))
    }

    func info(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        let name = tagName(tag)
        RiveLog.i(name, stripTagPrefix(message(), tag: name))
    }

    func error(tag: RiveRuntime.RiveLog.Tag, error: (any Error)?, _ message: @escaping () -> String) {
        let name = tagName(tag)
        let text = stripTagPrefix(message(), tag: name)
        let suffix = error.map { " (\($0.localizedDescription))" } ?? ""
        // RiveUIView draws its MTKView before Auto Layout has sized it, so the
        // first frame(s) have no drawable yet; the SDK logs that transient
        // condition at error level, which LogBox turns into a red screen in dev.
        // Rendering recovers on the next tick, so forward it as debug instead.
        // https://github.com/rive-app/rive-ios/blob/6.23.1/Source/Concurrency/View/RiveUIView.swift#L448-L453
        if case .view = tag, text == "Draw failed: missing drawable" {
            RiveLog.d(name, "\(text)\(suffix)")
            return
        }
        RiveLog.e(name, "\(text)\(suffix)")
    }

    func warning(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        let name = tagName(tag)
        RiveLog.w(name, stripTagPrefix(message(), tag: name))
    }

    func fault(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        let name = tagName(tag)
        RiveLog.e(name, stripTagPrefix(message(), tag: name))
    }

    func critical(tag: RiveRuntime.RiveLog.Tag, _ message: @escaping () -> String) {
        let name = tagName(tag)
        RiveLog.e(name, stripTagPrefix(message(), tag: name))
    }
}
