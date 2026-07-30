import UIKit

/// Runs teardown a couple of display frames after it was requested, or right
/// away if the app stops being visible first.
///
/// React unmounts a native-stack screen while its content is still on screen —
/// react-native-screens snapshots the outgoing screen in the same runloop turn
/// as the unmount — so releasing a Metal-backed view synchronously empties the
/// box the user is still looking at for the rest of the close transition
/// (issue #356). Two frames is what it takes for that snapshot to have settled;
/// frames rather than milliseconds because the thing being raced is itself
/// frame-driven, so this stays correct at 120 Hz.
///
/// CADisplayLink does not tick in the background, so backgrounding has to run
/// the pending work instead of stranding it — which is also when we most want
/// the GPU resources released.
@MainActor
final class DeferredTeardown {
  private static let framesToWait = 2

  private var link: CADisplayLink?
  private var remainingFrames = 0
  private var pendingWork: (() -> Void)?
  private var backgroundObserver: NSObjectProtocol?

  /// Schedules `work`. Ignored if work is already pending.
  func schedule(_ work: @escaping () -> Void) {
    guard pendingWork == nil else { return }
    pendingWork = work

    backgroundObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.didEnterBackgroundNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in
      MainActor.assumeIsolated {
        self?.flush()
      }
    }

    // Nothing on screen to protect, and no frames are coming.
    if UIApplication.shared.applicationState == .background {
      flush()
      return
    }

    remainingFrames = Self.framesToWait
    let link = CADisplayLink(target: self, selector: #selector(tick))
    link.add(to: .main, forMode: .common)
    self.link = link
  }

  /// Runs any pending work immediately.
  func flush() {
    let work = pendingWork
    stop()
    work?()
  }

  /// Drops any pending work without running it.
  func cancel() {
    stop()
  }

  @objc private func tick() {
    remainingFrames -= 1
    guard remainingFrames <= 0 else { return }
    flush()
  }

  private func stop() {
    pendingWork = nil
    remainingFrames = 0
    link?.invalidate()
    link = nil
    if let observer = backgroundObserver {
      NotificationCenter.default.removeObserver(observer)
      backgroundObserver = nil
    }
  }
}
