import NitroModules

class HybridRiveLogger: HybridRiveLoggerSpec {
    func setHandler(handler: @escaping (String, String, String) -> Void) throws {
        RiveLog.handler = handler
    }

    func resetHandler() throws {
        RiveLog.handler = nil
    }
}
