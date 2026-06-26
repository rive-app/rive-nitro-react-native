import Foundation
import NitroModules

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

/// Serializes access to the (non-thread-safe) Rive runtime onto the main thread.
///
/// The Rive iOS SDK (`RiveViewModel`, `RiveView`, data binding) and its Obj-C/C++
/// caches must only be touched from the main thread, where the state machine
/// advances and property listeners fire. Accessing them from the JS thread or a
/// Swift concurrency executor (as `Promise.async` does) races with the render loop
/// and corrupts those caches. Every native data-binding entry point funnels through
/// here. See https://github.com/rive-app/rive-nitro-react-native/issues/297
enum MainThread {
  /// Runs `work` synchronously on the main thread and returns its result.
  /// Runs inline when already on the main thread; otherwise hops via the main queue.
  @discardableResult
  static func run<T>(_ work: () throws -> T) rethrows -> T {
    if Thread.isMainThread {
      return try work()
    }
    return try DispatchQueue.main.sync(execute: work)
  }
}

extension Promise {
  /// Dispatches `work` to the main thread (where the Rive runtime is safe to touch)
  /// and returns a Promise that resolves once the work completes.
  /// See https://github.com/rive-app/rive-nitro-react-native/issues/297
  static func onMain(_ work: @escaping () throws -> T) -> Promise<T> {
    return Promise.parallel(.main, work)
  }
}
