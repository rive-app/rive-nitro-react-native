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
