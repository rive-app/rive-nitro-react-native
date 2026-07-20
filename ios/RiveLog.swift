enum RiveLogLevel: Int, Comparable {
    case debug = 0
    case info = 1
    case warn = 2
    case error = 3

    static func < (lhs: RiveLogLevel, rhs: RiveLogLevel) -> Bool {
        lhs.rawValue < rhs.rawValue
    }

    init?(string: String) {
        switch string {
        case "debug": self = .debug
        case "info": self = .info
        case "warn": self = .warn
        case "error": self = .error
        default: return nil
        }
    }
}

enum RiveLog {
    static var handler: ((String, String, String) -> Void)?
    static var minLevel: RiveLogLevel = .warn

    static func e(_ tag: String, _ message: String) {
        guard .error >= minLevel else { return }
        if let handler = handler {
            handler("error", tag, message)
        } else {
            RCTLogError("[\(tag)] \(message)")
        }
    }

    static func w(_ tag: String, _ message: String) {
        guard .warn >= minLevel else { return }
        if let handler = handler {
            handler("warn", tag, message)
        } else {
            RCTLogWarn("[\(tag)] \(message)")
        }
    }

    static func i(_ tag: String, _ message: String) {
        guard .info >= minLevel else { return }
        if let handler = handler {
            handler("info", tag, message)
        } else {
            RCTLogInfo("[\(tag)] \(message)")
        }
    }

    static func d(_ tag: String, _ message: String) {
        guard .debug >= minLevel else { return }
        if let handler = handler {
            handler("debug", tag, message)
        } else {
            RCTLog("[\(tag)] \(message)")
        }
    }
}
