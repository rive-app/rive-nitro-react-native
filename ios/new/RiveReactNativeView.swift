import RiveRuntime
import NitroModules
import UIKit
import MetalKit

enum ExperimentalBindData {
  case none
  case auto
  case instance(ViewModelInstance)
  case byName(String)
}

struct ExperimentalViewConfiguration {
  let artboardName: String?
  let stateMachineName: String?
  let autoPlay: Bool
  let file: File
  let fit: RiveRuntime.Fit
  let bindData: ExperimentalBindData
}

@MainActor
class RiveReactNativeView: UIView {
  private var riveUIView: RiveUIView?
  private var riveInstance: RiveRuntime.Rive?
  private var eventListeners: [(UnifiedRiveEvent) -> Void] = []
  private var viewReadyContinuations: [CheckedContinuation<Void, Never>] = []
  private var isViewReady = false
  private var configTask: Task<Void, Never>?
  private var isPaused = false
  private var pendingFit: RiveRuntime.Fit?

  var autoPlay: Bool = true

  override func layoutSubviews() {
    super.layoutSubviews()
    applyPendingFitIfMTKViewReady()
  }

  // https://github.com/rive-app/rive-nitro-react-native/pull/231
  private func applyPendingFitIfMTKViewReady() {
    guard let fit = pendingFit, let rive = riveInstance,
          riveUIView?.subviews.contains(where: { $0 is MTKView }) == true else { return }
    rive.fit = fit
    pendingFit = nil
  }

  func awaitViewReady() async -> Bool {
    if !isViewReady {
      await withCheckedContinuation { continuation in
        viewReadyContinuations.append(continuation)
      }
    }
    return true
  }

  func configure(_ config: ExperimentalViewConfiguration, dataBindingChanged: Bool = false, reload: Bool = false, initialUpdate: Bool = false) {
    dispatchPrecondition(condition: .onQueue(.main))
    RCTLog("[RiveReactNativeView] configure called - reload: \(reload), dataBindingChanged: \(dataBindingChanged), initialUpdate: \(initialUpdate)")

    if reload {
      cleanup()
    }

    if reload || dataBindingChanged || initialUpdate {
      configTask?.cancel()
      configTask = Task { [weak self] in
        guard let self else { return }
        do {
          RCTLog("[RiveReactNativeView] Creating artboard: \(config.artboardName ?? "default")")
          let artboard = try await config.file.createArtboard(config.artboardName)

          RCTLog("[RiveReactNativeView] Creating state machine: \(config.stateMachineName ?? "default")")
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

          RCTLog("[RiveReactNativeView] Creating Rive instance...")
          let rive = try await RiveRuntime.Rive(
            file: config.file,
            artboard: artboard,
            stateMachine: stateMachine,
            dataBind: dataBind
          )

          guard !Task.isCancelled else { return }

          RCTLog("[RiveReactNativeView] Rive instance created successfully")
          self.riveInstance = rive
          self.setupRiveUIView(with: rive)

          self.pendingFit = config.fit

          if config.autoPlay {
            self.isPaused = false
          }

          if !self.isViewReady {
            self.isViewReady = true
            for continuation in self.viewReadyContinuations {
              continuation.resume()
            }
            self.viewReadyContinuations.removeAll()
          }
          RCTLog("[RiveReactNativeView] Configuration complete!")
        } catch {
          RCTLogError("[RiveReactNativeView] Failed to configure: \(error)")
        }
      }
    } else {
      riveInstance?.fit = config.fit
    }
  }

  func bindViewModelInstance(viewModelInstance: ViewModelInstance) {
    riveInstance?.stateMachine.bindViewModelInstance(viewModelInstance)
  }

  func getViewModelInstance() -> ViewModelInstance? {
    return riveInstance?.viewModelInstance
  }

  func play() {
    isPaused = false
  }

  func pause() {
    isPaused = true
  }

  func reset() {
    isPaused = true
  }

  func playIfNeeded() {
    if isPaused {
      isPaused = false
    }
  }

  func addEventListener(_ onEvent: @escaping (UnifiedRiveEvent) -> Void) {
    eventListeners.append(onEvent)
  }

  func removeEventListeners() {
    eventListeners.removeAll()
  }

  func setNumberInputValue(name: String, value: Float, path: String?) throws {
    throw RuntimeError.error(withMessage: "SMI inputs not supported in experimental API")
  }

  func getNumberInputValue(name: String, path: String?) throws -> Float {
    throw RuntimeError.error(withMessage: "SMI inputs not supported in experimental API")
  }

  func setBooleanInputValue(name: String, value: Bool, path: String?) throws {
    throw RuntimeError.error(withMessage: "SMI inputs not supported in experimental API")
  }

  func getBooleanInputValue(name: String, path: String?) throws -> Bool {
    throw RuntimeError.error(withMessage: "SMI inputs not supported in experimental API")
  }

  func triggerInput(name: String, path: String?) throws {
    throw RuntimeError.error(withMessage: "SMI inputs not supported in experimental API")
  }

  func setTextRunValue(name: String, value: String, path: String?) throws {
    throw RuntimeError.error(withMessage: "Text runs not supported in experimental API")
  }

  func getTextRunValue(name: String, path: String?) throws -> String {
    throw RuntimeError.error(withMessage: "Text runs not supported in experimental API")
  }

  // MARK: - Internal

  private func setupRiveUIView(with rive: RiveRuntime.Rive) {
    // Remove existing view if any
    // Note: The old RiveUIView's MTKView may still fire a few draw calls after removal,
    // which can cause "state machine not found" errors if the old state machine is deallocated.
    // This is a limitation of the experimental API - RiveUIView.rive is not publicly settable.
    riveUIView?.removeFromSuperview()

    let uiView = RiveUIView(rive: rive)
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

  private func cleanup() {
    dispatchPrecondition(condition: .onQueue(.main))
    configTask?.cancel()
    configTask = nil
    riveUIView?.removeFromSuperview()
    riveUIView = nil
    riveInstance = nil
  }

  deinit {
    MainActor.assumeIsolated {
      cleanup()
    }
  }
}
