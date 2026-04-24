enum RiveLog {
    static var handler: ((String, String, String) -> Void)?

    static func e(_ tag: String, _ message: String) {
        if let handler = handler {
            handler("error", tag, message)
        } else {
            RCTLogError("[\(tag)] \(message)")
        }
    }

    static func w(_ tag: String, _ message: String) {
        if let handler = handler {
            handler("warn", tag, message)
        } else {
            RCTLogWarn("[\(tag)] \(message)")
        }
    }

    static func i(_ tag: String, _ message: String) {
        if let handler = handler {
            handler("info", tag, message)
        } else {
            RCTLogInfo("[\(tag)] \(message)")
        }
    }

    static func d(_ tag: String, _ message: String) {
        if let handler = handler {
            handler("debug", tag, message)
        } else {
            RCTLog("[\(tag)] \(message)")
        }
    }
}
