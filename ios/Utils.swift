final class Weak<T: AnyObject> {
  weak var value: T?

  init(_ value: T) {
    self.value = value
  }
}

final class SendableRef<T: Sendable>: @unchecked Sendable {
  var value: T

  init(_ value: T) {
    self.value = value
  }
}

/// Executes a closure, logging any thrown error with an optional note and tag using RCTLogError.
func logged(tag: String, note: String? = nil, _ fn: () throws -> Void) {
  do {
    return try fn()
  } catch (let e) {
    RCTLogError("[RIVE] \(tag) \(note ?? "") \(e)")
  }
}
