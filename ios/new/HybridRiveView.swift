@_spi(RiveExperimental) import RiveRuntime
import Foundation
import NitroModules
import UIKit

private struct DefaultConfiguration {
  static let autoPlay = true
}

typealias HybridDataBindMode = Variant__any_HybridViewModelInstanceSpec__DataBindMode_DataBindByName

extension Optional
where Wrapped == HybridDataBindMode {
  func toExperimentalBindData() throws -> ExperimentalBindData {
    guard let value = self else {
      return .auto
    }

    switch value {
    case .first(let viewModelInstance):
      if let instance = (viewModelInstance as? HybridViewModelInstance)?.viewModelInstance {
        return .instance(instance)
      } else {
        throw RuntimeError.error(withMessage: "Invalid ViewModelInstance")
      }
    case .second(let mode):
      switch mode {
      case .auto:
        return .auto
      case .none:
        return .none
      }
    case .third(let dataBindByName):
      return .byName(dataBindByName.byName)
    }
  }

  func isEqual(to other: HybridDataBindMode?) -> Bool {
    guard let lhs = self, let rhs = other else {
      return self == nil && other == nil
    }

    switch (lhs, rhs) {
    case (.first(let lhsInstance), .first(let rhsInstance)):
      let lhsVMI = (lhsInstance as? HybridViewModelInstance)?.viewModelInstance
      let rhsVMI = (rhsInstance as? HybridViewModelInstance)?.viewModelInstance
      return lhsVMI === rhsVMI
    case (.second(let lhsMode), .second(let rhsMode)):
      return lhsMode == rhsMode
    case (.third(let lhsByName), .third(let rhsByName)):
      return lhsByName.byName == rhsByName.byName
    default:
      return false
    }
  }
}

class HybridRiveView: HybridRiveViewSpec {
  func play() throws -> NitroModules.Promise<Void> {
    return Promise.async {
      try await self.getRiveView().play()
    }
  }

  func pause() throws -> NitroModules.Promise<Void> {
    return Promise.async {
      try await self.getRiveView().pause()
    }
  }

  func reset() throws -> NitroModules.Promise<Void> {
    return Promise.async {
      try await self.getRiveView().reset()
    }
  }

  func playIfNeeded() {
    MainActor.assumeIsolated {
      try? self.getRiveView().playIfNeeded()
    }
  }

  // MARK: View Props
  var dataBind: HybridDataBindMode? {
    didSet {
      if !dataBind.isEqual(to: oldValue) {
        dataBindingChanged = true
      }
    }
  }

  var artboardName: String? { didSet { needsReload = true } }
  var stateMachineName: String? { didSet { needsReload = true } }
  var autoPlay: Bool? { didSet { needsReload = true } }
  var file: (any HybridRiveFileSpec) = HybridRiveFile() {
    didSet { needsReload = true }
  }
  var alignment: Alignment?
  var fit: Fit?
  var layoutScaleFactor: Double?
  var onError: (RiveError) -> Void = { _ in }

  func awaitViewReady() throws -> Promise<Bool> {
    return Promise.async { [self] in
      return try await getRiveView().awaitViewReady()
    }
  }

  func bindViewModelInstance(viewModelInstance: (any HybridViewModelInstanceSpec)) throws {
    guard let vmi = (viewModelInstance as? HybridViewModelInstance)?.viewModelInstance
    else { return }
    try MainActor.assumeIsolated {
      try getRiveView().bindViewModelInstance(viewModelInstance: vmi)
    }
  }

  func getViewModelInstance() throws -> (any HybridViewModelInstanceSpec)? {
    return try MainActor.assumeIsolated {
      guard let vmi = try getRiveView().getViewModelInstance() else { return nil }
      guard let hybridFile = file as? HybridRiveFile, let worker = hybridFile.worker else {
        throw RuntimeError.error(withMessage: "No worker available from file")
      }
      return HybridViewModelInstance(viewModelInstance: vmi, worker: worker)
    }
  }

  func onEventListener(onEvent: @escaping (UnifiedRiveEvent) -> Void) throws {
    throw RuntimeError.error(withMessage: "Events are not supported in the experimental iOS API")
  }

  func removeEventListeners() throws {
    throw RuntimeError.error(withMessage: "Events are not supported in the experimental iOS API")
  }

  func setNumberInputValue(name: String, value: Double, path: String?) throws {
    try MainActor.assumeIsolated {
      try getRiveView().setNumberInputValue(name: name, value: Float(value), path: path)
    }
  }

  func getNumberInputValue(name: String, path: String?) throws -> Double {
    return try MainActor.assumeIsolated {
      try Double(getRiveView().getNumberInputValue(name: name, path: path))
    }
  }

  func setBooleanInputValue(name: String, value: Bool, path: String?) throws {
    try MainActor.assumeIsolated {
      try getRiveView().setBooleanInputValue(name: name, value: value, path: path)
    }
  }

  func getBooleanInputValue(name: String, path: String?) throws -> Bool {
    return try MainActor.assumeIsolated {
      try getRiveView().getBooleanInputValue(name: name, path: path)
    }
  }

  func triggerInput(name: String, path: String?) throws {
    try MainActor.assumeIsolated {
      try getRiveView().triggerInput(name: name, path: path)
    }
  }

  func setTextRunValue(name: String, value: String, path: String?) throws {
    try MainActor.assumeIsolated {
      try getRiveView().setTextRunValue(name: name, value: value, path: path)
    }
  }

  func getTextRunValue(name: String, path: String?) throws -> String {
    return try MainActor.assumeIsolated {
      try getRiveView().getTextRunValue(name: name, path: path)
    }
  }

  // MARK: Views
  var view: UIView = RiveReactNativeView()
  func getRiveView() throws -> RiveReactNativeView {
    guard let riveView = view as? RiveReactNativeView else {
      throw RuntimeError.error(withMessage: "RiveReactNativeView is null or not configured")
    }
    return riveView
  }

  // MARK: Update
  func afterUpdate() {
    logged(tag: "HybridRiveView", note: "afterUpdate") {
      guard let hybridFile = file as? HybridRiveFile else {
        RCTLogError("[HybridRiveView] file is not HybridRiveFile: \(type(of: file))")
        return
      }
      guard let riveFile = hybridFile.file else {
        RCTLogError("[HybridRiveView] hybridFile.file is nil")
        return
      }

      let config = ExperimentalViewConfiguration(
        artboardName: artboardName,
        stateMachineName: stateMachineName,
        autoPlay: autoPlay ?? DefaultConfiguration.autoPlay,
        file: riveFile,
        fit: toExperimentalFit(fit, alignment: alignment, layoutScaleFactor: layoutScaleFactor),
        bindData: try dataBind.toExperimentalBindData()
      )

      try MainActor.assumeIsolated {
        let riveView = try getRiveView()
        riveView.configure(
          config, dataBindingChanged: dataBindingChanged, reload: needsReload,
          initialUpdate: initialUpdate)
        needsReload = false
        dataBindingChanged = false
        initialUpdate = false
      }
    }
  }

  // MARK: Internal State
  private var needsReload = false
  private var dataBindingChanged = false
  private var initialUpdate = true

  // MARK: Helpers
  private func toExperimentalFit(
    _ fit: Fit?,
    alignment: Alignment?,
    layoutScaleFactor: Double?
  ) -> RiveRuntime.Fit {
    let expAlignment = toExperimentalAlignment(alignment) ?? .center

    switch fit ?? .contain {
    case .fill: return .fill(alignment: expAlignment)
    case .contain: return .contain(alignment: expAlignment)
    case .cover: return .cover(alignment: expAlignment)
    case .fitwidth: return .fitWidth(alignment: expAlignment)
    case .fitheight: return .fitHeight(alignment: expAlignment)
    case .none: return .none(alignment: expAlignment)
    case .scaledown: return .scaleDown(alignment: expAlignment)
    case .layout:
      if let sf = layoutScaleFactor {
        return .layout(scaleFactor: .explicit(Float(sf)))
      }
      return .layout(scaleFactor: .automatic)
    }
  }

  private func toExperimentalAlignment(_ alignment: Alignment?) -> RiveRuntime.Alignment? {
    guard let alignment = alignment else { return nil }

    switch alignment {
    case .topleft: return .topLeft
    case .topcenter: return .topCenter
    case .topright: return .topRight
    case .centerleft: return .centerLeft
    case .center: return .center
    case .centerright: return .centerRight
    case .bottomleft: return .bottomLeft
    case .bottomcenter: return .bottomCenter
    case .bottomright: return .bottomRight
    }
  }
}

extension HybridRiveView {
  func logged(tag: String, note: String? = nil, _ fn: () throws -> Void) {
    do {
      return try fn()
    } catch let e {
      let noteString = note.map { " \($0)" } ?? ""
      let errorMessage = "[RIVE] \(tag)\(noteString) \(e.localizedDescription)"

      let riveError = RiveError(
        message: errorMessage,
        type: .unknown
      )
      onError(riveError)
    }
  }
}
