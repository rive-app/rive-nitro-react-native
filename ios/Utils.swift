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
  /// Runs `work` on the main thread and returns an already-resolved (or rejected)
  /// Promise.
  ///
  /// Unlike `Promise.async`, the work runs on the main thread (so it is safe to
  /// touch the Rive runtime) and the Promise is resolved synchronously on the
  /// calling (JS) thread. Because it is already resolved by the time Nitro attaches
  /// its `.then` continuation, the Promise's continuation list is never mutated from
  /// two threads at once — eliminating the data races that `Promise.async` produced
  /// by resolving on a background executor.
  static func onMain(_ work: () throws -> T) -> Promise<T> {
    do {
      return Promise.resolved(withResult: try MainThread.run(work))
    } catch {
      return Promise.rejected(withError: error)
    }
  }
}
