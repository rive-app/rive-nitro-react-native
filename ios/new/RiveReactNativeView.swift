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
  // The runtime can't hand back what a state machine has bound, so we keep it.
  private var boundInstance: ViewModelInstance?
  private var bindTask: Task<Void, Never>?
  private var viewReadyContinuations: [CheckedContinuation<Bool, Never>] = []
  private var isViewReady = false
  private var configTask: Task<Void, Never>?
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
    // without resolving an instance first; the other modes fall through to the rebuild.
    if !reload, !initialUpdate, dataBindingChanged,
       let rive = riveInstance, case .instance(let vmi) = config.bindData {
      bind(vmi, to: rive)
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

          let bindingInstance: ViewModelInstance?
          switch config.bindData {
          case .none:
            bindingInstance = nil
          case .auto:
            // Probe for a default ViewModel first. If the artboard has none,
            // the SDK would fire an error event — skip auto-binding silently instead.
            do {
              let _ = try await config.file.getDefaultViewModelInfo(for: artboard)
              bindingInstance = try await config.file.createViewModelInstance(
                .viewModelDefault(from: .artboardDefault(artboard))
              )
            } catch {
              bindingInstance = nil
            }
          case .instance(let vmi):
            bindingInstance = vmi
          case .byName(let name):
            let vmInfo = try await config.file.getDefaultViewModelInfo(for: artboard)
            bindingInstance = try await config.file.createViewModelInstance(.name(name, from: .name(vmInfo.viewModelName)))
          }

          let stateMachine = try await artboard.createStateMachine(config.stateMachineName, binding: bindingInstance)

          guard !Task.isCancelled else { return }

          let rive = try await RiveRuntime.Rive(
            file: config.file,
            artboard: artboard,
            stateMachine: stateMachine,
            fit: config.fit
          )

          guard !Task.isCancelled else { return }

          self.riveInstance = rive
          self.boundInstance = bindingInstance
          if let pending = self.pendingBindInstance {
            self.pendingBindInstance = nil
            self.bind(pending, to: rive)
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
      bind(viewModelInstance, to: rive)
    } else {
      // configTask hasn't finished yet — queue it to apply once riveInstance is set
      pendingBindInstance = viewModelInstance
    }
  }

  func getViewModelInstance() -> ViewModelInstance? {
    return boundInstance
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

  /// boundInstance is updated right away so getViewModelInstance() reflects the
  /// request; the task drops the bind if a newer bind or a reconfigure superseded it.
  private func bind(_ instance: ViewModelInstance, to rive: RiveRuntime.Rive) {
    boundInstance = instance
    bindTask?.cancel()
    bindTask = Task { [weak self] in
      guard let self, self.riveInstance === rive, self.boundInstance === instance else { return }
      do {
        try await rive.stateMachine.bindViewModelInstances(main: instance)
      } catch {
        guard !Task.isCancelled else { return }
        RiveLog.e("RiveReactNativeView", "Failed to bind view model instance: \(error.localizedDescription)")
      }
    }
  }

  private func setupRiveUIView(with rive: RiveRuntime.Rive) {
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
    bindTask?.cancel()
    bindTask = nil
    riveUIView?.removeFromSuperview()
    riveUIView = nil
    riveInstance = nil
    boundInstance = nil
    pendingBindInstance = nil
  }

  /// Teardown runs when Fabric drops the view, not when the JS effect cleanup
  /// calls dispose().
  ///
  /// The effect cleanup fires in React's commit phase, before the mounting
  /// instructions reach native views — potentially a whole transaction early.
  /// react-native-screens captures the outgoing screen during that transaction
  /// (`unmountChildComponentView`), and a render-server composite landing in the
  /// gap bakes our half-torn-down view into that capture, so the screen slides
  /// away empty (#356). Fabric's own unmount happens inside the same transaction
  /// as the capture, leaving no room for one — which is why plain RN views never
  /// show this.
  override func willMove(toSuperview newSuperview: UIView?) {
    super.willMove(toSuperview: newSuperview)
    // Unconditional: a view whose configure failed has no riveUIView but can
    // still have awaitViewReady() waiters, and detach() is what settles them.
    if newSuperview == nil {
      detach()
    }
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
    let bindTask = bindTask
    let uiView = riveUIView
    if Thread.isMainThread {
      task?.cancel()
      bindTask?.cancel()
      uiView?.removeFromSuperview()
    } else {
      DispatchQueue.main.async {
        task?.cancel()
        bindTask?.cancel()
        uiView?.removeFromSuperview()
      }
    }
  }
}
