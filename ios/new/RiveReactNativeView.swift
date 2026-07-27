import RiveRuntime
import NitroModules
import UIKit

enum BindData {
  case none
  case auto
  case instance(ViewModelInstance)
  case byName(String)
}

struct ViewConfiguration {
  let artboardName: String?
  let stateMachineName: String?
  let autoPlay: Bool
  let file: File
  let fit: RiveRuntime.Fit
  let semantics: RiveRuntime.Semantics
  let frameRate: RiveRuntime.FrameRate
  let bindData: BindData
}

@MainActor
class RiveReactNativeView: UIView {
  private var riveUIView: RiveUIView?
  private var riveInstance: RiveRuntime.Rive?
  private var pendingBindInstance: ViewModelInstance?
  private var viewReadyContinuations: [CheckedContinuation<Bool, Never>] = []
  private var isViewReady = false
  private var configTask: Task<Void, Never>?
  private var settledTask: Task<Void, Never>?
  private var stopNotifyTask: Task<Void, Never>?
  private var isPaused = false
  private var semantics: RiveRuntime.Semantics = RiveUIView.Constants.Defaults.semantics {
    didSet { riveUIView?.semantics = semantics }
  }
  private var frameRate: RiveRuntime.FrameRate = RiveUIView.Constants.Defaults.frameRate {
    didSet { riveUIView?.frameRate = frameRate }
  }
  var autoPlay: Bool = true

  /// Configure failures are reported here (wired to the onError prop).
  var onLoadError: ((String) -> Void)?

  /// Fired whenever the state machine settles (reaches rest, e.g. a
  /// non-looping animation reaching its end); wired to the onStop prop.
  var onSettled: (() -> Void)?

  func awaitViewReady() async -> Bool {
    if isViewReady {
      return true
    }
    return await withCheckedContinuation { continuation in
      viewReadyContinuations.append(continuation)
    }
  }

  private func resumeViewReadyContinuations(_ result: Bool) {
    let continuations = viewReadyContinuations
    viewReadyContinuations.removeAll()
    for continuation in continuations {
      continuation.resume(returning: result)
    }
  }

  func configure(_ config: ViewConfiguration, dataBindingChanged: Bool = false, reload: Bool = false, initialUpdate: Bool = false) {
    dispatchPrecondition(condition: .onQueue(.main))

    semantics = config.semantics
    frameRate = config.frameRate

    if reload {
      cleanup()
    }

    // A dataBind-only change with a live instance re-binds the running state
    // machine instead of rebuilding artboard + state machine, which would
    // visually restart the animation. Only the .instance case can bind
    // without async resolution; the other modes fall through to the rebuild.
    if !reload, !initialUpdate, dataBindingChanged,
       let rive = riveInstance, case .instance(let vmi) = config.bindData {
      rive.stateMachine.bindViewModelInstance(vmi)
      rive.fit = config.fit
      return
    }

    if reload || dataBindingChanged || initialUpdate {
      // Applied synchronously so a play()/pause() issued while the config
      // task is still in flight isn't clobbered when it completes — the task
      // reads the then-current isPaused instead of recomputing it.
      isPaused = !config.autoPlay
      configTask?.cancel()
      configTask = Task { [weak self] in
        guard let self else { return }
        do {
          let artboard = try await config.file.createArtboard(config.artboardName)
          let stateMachine = try await artboard.createStateMachine(config.stateMachineName)

          let dataBind: RiveRuntime.DataBind
          switch config.bindData {
          case .none:
            dataBind = .none
          case .auto:
            // Probe for a default ViewModel first. If the artboard has none,
            // the SDK would fire an error event — skip auto-binding silently instead.
            do {
              let _ = try await config.file.getDefaultViewModelInfo(for: artboard)
              dataBind = .auto
            } catch {
              dataBind = .none
            }
          case .instance(let vmi):
            dataBind = .instance(vmi)
          case .byName(let name):
            let vmInfo = try await config.file.getDefaultViewModelInfo(for: artboard)
            let vmi = try await config.file.createViewModelInstance(.name(name, from: .name(vmInfo.viewModelName)))
            dataBind = .instance(vmi)
          }

          guard !Task.isCancelled else { return }

          let rive = try await RiveRuntime.Rive(
            file: config.file,
            artboard: artboard,
            stateMachine: stateMachine,
            dataBind: dataBind,
            fit: config.fit
          )

          guard !Task.isCancelled else { return }

          self.riveInstance = rive
          if let pending = self.pendingBindInstance {
            self.pendingBindInstance = nil
            rive.stateMachine.bindViewModelInstance(pending)
          }
          self.setupRiveUIView(with: rive)

          if !self.isViewReady {
            self.isViewReady = true
            self.resumeViewReadyContinuations(true)
          }
        } catch {
          guard !Task.isCancelled else { return }
          let message = (error as NSError).localizedDescription
          RiveLog.e("RiveReactNativeView", "Failed to configure: \(message)")
          self.onLoadError?(message)
          self.resumeViewReadyContinuations(false)
        }
      }
    } else {
      riveInstance?.fit = config.fit
    }
  }

  func bindViewModelInstance(viewModelInstance: ViewModelInstance) {
    if let rive = riveInstance {
      rive.stateMachine.bindViewModelInstance(viewModelInstance)
    } else {
      // configTask hasn't finished yet — queue it to apply once riveInstance is set
      pendingBindInstance = viewModelInstance
    }
  }

  func getViewModelInstance() -> ViewModelInstance? {
    return riveInstance?.viewModelInstance
  }

  func play() {
    isPaused = false
    riveUIView?.isPaused = false
  }

  func pause() {
    isPaused = true
    riveUIView?.isPaused = true
  }

  func reset() {
    // Deprecated: the experimental Rive runtime has no reset primitive.
    RiveLog.e("RiveReactNativeView", "reset() is deprecated and not supported on the new runtime")
  }

  func playIfNeeded() {
    if isPaused {
      isPaused = false
      riveUIView?.isPaused = false
    }
  }

  func setNumberInputValue(name: String, value: Float, path: String?) throws {
    throw RuntimeError.error(withMessage: "SMI inputs are not supported by the new runtime — use data binding")
  }

  func getNumberInputValue(name: String, path: String?) throws -> Float {
    throw RuntimeError.error(withMessage: "SMI inputs are not supported by the new runtime — use data binding")
  }

  func setBooleanInputValue(name: String, value: Bool, path: String?) throws {
    throw RuntimeError.error(withMessage: "SMI inputs are not supported by the new runtime — use data binding")
  }

  func getBooleanInputValue(name: String, path: String?) throws -> Bool {
    throw RuntimeError.error(withMessage: "SMI inputs are not supported by the new runtime — use data binding")
  }

  func triggerInput(name: String, path: String?) throws {
    throw RuntimeError.error(withMessage: "SMI inputs are not supported by the new runtime — use data binding")
  }

  func setTextRunValue(name: String, value: String, path: String?) throws {
    throw RuntimeError.error(withMessage: "Text runs are not supported by the new runtime — use data binding")
  }

  func getTextRunValue(name: String, path: String?) throws -> String {
    throw RuntimeError.error(withMessage: "Text runs are not supported by the new runtime — use data binding")
  }

  // MARK: - Internal

  private func observeSettled(of rive: RiveRuntime.Rive) {
    settledTask?.cancel()
    // A stop scheduled by the previous Rive instance must not fire into the
    // new one after a reconfigure.
    stopNotifyTask?.cancel()
    stopNotifyTask = nil
    settledTask = Task { [weak self] in
      for await _ in rive.stateMachine.settledStream() {
        guard !Task.isCancelled else { return }
        self?.scheduleStopNotification()
      }
    }
  }

  // The SDK can emit settle back-to-back right after configure (an initial
  // rest, immediately perturbed by setup — e.g. data-bind — and re-settling),
  // which would otherwise report two stops for a single, user-visible "came
  // to rest". Coalesce a tight burst into one onStop call.
  private func scheduleStopNotification() {
    stopNotifyTask?.cancel()
    stopNotifyTask = Task { [weak self] in
      try? await Task.sleep(nanoseconds: 150_000_000)
      guard !Task.isCancelled else { return }
      self?.onSettled?()
    }
  }

  private func setupRiveUIView(with rive: RiveRuntime.Rive) {
    observeSettled(of: rive)
    if let existing = riveUIView {
      // Reuse the existing view — avoids tearing down the MTKView on every
      // reconfigure, which previously caused orphaned draw calls ("state machine
      // not found") from the old MTKView after removeFromSuperview.
      existing.rive = rive
      existing.isPaused = isPaused
      existing.semantics = semantics
      existing.frameRate = frameRate
    } else {
      let uiView = RiveUIView(rive: rive, isPaused: isPaused)
      uiView.semantics = semantics
      uiView.frameRate = frameRate
      uiView.translatesAutoresizingMaskIntoConstraints = false
      addSubview(uiView)
      NSLayoutConstraint.activate([
        uiView.leadingAnchor.constraint(equalTo: leadingAnchor),
        uiView.trailingAnchor.constraint(equalTo: trailingAnchor),
        uiView.topAnchor.constraint(equalTo: topAnchor),
        uiView.bottomAnchor.constraint(equalTo: bottomAnchor),
      ])
      self.riveUIView = uiView
    }
  }

  private func cleanup() {
    dispatchPrecondition(condition: .onQueue(.main))
    configTask?.cancel()
    configTask = nil
    settledTask?.cancel()
    settledTask = nil
    stopNotifyTask?.cancel()
    stopNotifyTask = nil
    riveUIView?.removeFromSuperview()
    riveUIView = nil
    riveInstance = nil
    pendingBindInstance = nil
  }

  /// Final teardown, called from HybridRiveView.dispose() (always on main).
  /// Unlike the reload-path cleanup(), this also settles any pending
  /// awaitViewReady() callers so their promises (which retain this view)
  /// don't hang forever.
  func detach() {
    resumeViewReadyContinuations(false)
    cleanup()
  }

  deinit {
    // deinit is nonisolated and Nitro can drop the last reference off the
    // main thread (JS/GC thread); cleanup() must run on main. Capture the
    // resources, not self.
    let task = configTask
    let settled = settledTask
    let stopNotify = stopNotifyTask
    let uiView = riveUIView
    if Thread.isMainThread {
      task?.cancel()
      settled?.cancel()
      stopNotify?.cancel()
      uiView?.removeFromSuperview()
    } else {
      DispatchQueue.main.async {
        task?.cancel()
        settled?.cancel()
        stopNotify?.cancel()
        uiView?.removeFromSuperview()
      }
    }
  }
}
