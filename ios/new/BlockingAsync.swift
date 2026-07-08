import Foundation
import NitroModules

/// Runs async work on MainActor and blocks the calling thread until complete.
/// Safe to call from JS thread (Nitro bridge) - blocks JS thread, not main thread.
///
/// How this works:
/// 1. Swift method called on **JS thread** (from Nitro/C++)
/// 2. `semaphore.wait()` blocks **JS thread**
/// 3. `Task { @MainActor in }` schedules work on **main thread**
/// 4. **Main thread is FREE** → async work completes
/// 5. `semaphore.signal()` → JS thread unblocks
/// 6. **No deadlock!**
func blockingAsync<T>(_ work: @escaping @MainActor () async throws -> T) throws -> T {
  if Thread.isMainThread {
    // Deliberate: blocking the main thread here would deadlock the MainActor
    // work this waits on. Throwing beats trapping the whole app.
    throw RuntimeError.error(
      withMessage: "Deprecated blocking Rive API called on the main thread - use the *Async variant")
  }
  let semaphore = DispatchSemaphore(value: 0)
  var result: Result<T, Error>!

  Task { @MainActor in
    do {
      result = .success(try await work())
    } catch {
      result = .failure(error)
    }
    semaphore.signal()
  }

  semaphore.wait()

  switch result! {
  case .success(let value): return value
  case .failure(let error): throw error
  }
}

/// Variant for operations that don't throw (still throws if misused on main)
func blockingAsync<T>(_ work: @escaping @MainActor () async -> T) throws -> T {
  if Thread.isMainThread {
    // Deliberate: blocking the main thread here would deadlock the MainActor
    // work this waits on. Throwing beats trapping the whole app.
    throw RuntimeError.error(
      withMessage: "Deprecated blocking Rive API called on the main thread - use the *Async variant")
  }
  let semaphore = DispatchSemaphore(value: 0)
  var result: T!

  Task { @MainActor in
    result = await work()
    semaphore.signal()
  }

  semaphore.wait()

  return result
}
