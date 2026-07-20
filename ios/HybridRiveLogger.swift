import NitroModules

class HybridRiveLogger: HybridRiveLoggerSpec {
    func setHandler(handler: @escaping (String, String, String) -> Void) throws {
        RiveLog.handler = handler
    }

    func resetHandler() throws {
        RiveLog.handler = nil
    }

    func setLogLevel(level: String) throws {
        guard let parsed = RiveLogLevel(string: level) else {
            throw RuntimeError.error(withMessage: "Invalid log level '\(level)'. Use: debug, info, warn, error")
        }
        RiveLog.minLevel = parsed
    }
}
