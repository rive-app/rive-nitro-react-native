import Foundation
import NitroModules
import RiveRuntime
import UIKit

private struct DefaultConfiguration {
  static let autoPlay = true
  static let alignment = RiveAlignment.center
  static let fit = RiveFit.contain
  static let layoutScaleFactor = RiveRuntime.RiveViewModel.layoutScaleFactorAutomatic
}

typealias HybridDataBindMode = Variant__any_HybridViewModelInstanceSpec__DataBindMode_DataBindByName

extension Optional
where Wrapped == HybridDataBindMode {
  func toDataBingMode() throws -> BindData {
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
}

class HybridRiveView: HybridRiveViewSpec {
  // MARK: View Props
  var dataBind: HybridDataBindMode? = nil {
    didSet {
      dataBindingChanged = true
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
    guard let viewModelInstance = (viewModelInstance as? HybridViewModelInstance)?.viewModelInstance
    else { return }
    try getRiveView().bindViewModelInstance(viewModelInstance: viewModelInstance)
  }

  func getViewModelInstance() throws -> (any HybridViewModelInstanceSpec)? {
    guard let viewModelInstance = try getRiveView().getViewModelInstance() else { return nil }
    return HybridViewModelInstance(viewModelInstance: viewModelInstance)
  }

  func play() throws { try getRiveView().play() }

  func pause() throws { try getRiveView().pause() }

  func onEventListener(onEvent: @escaping (UnifiedRiveEvent) -> Void) throws {
    try getRiveView().addEventListener(onEvent)
  }

  func removeEventListeners() throws { try getRiveView().removeEventListeners() }

  func setNumberInputValue(name: String, value: Double, path: String?) throws {
    try getRiveView().setNumberInputValue(name: name, value: Float(value), path: path)
  }

  func getNumberInputValue(name: String, path: String?) throws -> Double {
    return try Double(getRiveView().getNumberInputValue(name: name, path: path))
  }

  func setBooleanInputValue(name: String, value: Bool, path: String?) throws {
    try getRiveView().setBooleanInputValue(name: name, value: value, path: path)
  }

  func getBooleanInputValue(name: String, path: String?) throws -> Bool {
    return try getRiveView().getBooleanInputValue(name: name, path: path)
  }

  func triggerInput(name: String, path: String?) throws {
    try getRiveView().triggerInput(name: name, path: path)
  }

  func setTextRunValue(name: String, value: String, path: String?) throws {
    try getRiveView().setTextRunValue(name: name, value: value, path: path)
  }

  func getTextRunValue(name: String, path: String?) throws -> String {
    return try getRiveView().getTextRunValue(name: name, path: path)
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
      guard let hybridFile = file as? HybridRiveFile,
        let file = hybridFile.riveFile
      else { return }

      let config = ViewConfiguration(
        artboardName: artboardName,
        stateMachineName: stateMachineName,
        autoPlay: autoPlay ?? DefaultConfiguration.autoPlay,
        riveFile: file,
        viewSource: hybridFile,
        alignment: convertAlignment(alignment) ?? DefaultConfiguration.alignment,
        fit: convertFit(fit) ?? DefaultConfiguration.fit,
        layoutScaleFactor: layoutScaleFactor ?? DefaultConfiguration.layoutScaleFactor,
        bindData: try dataBind.toDataBingMode()
      )

      let riveView = try getRiveView()
      try riveView.configure(
        config, dataBindingChanged: dataBindingChanged, reload: needsReload,
        initialUpdate: initialUpdate)
      needsReload = false
      dataBindingChanged = false
      initialUpdate = false
    }
  }

  // MARK: Internal State
  private var needsReload = false
  private var dataBindingChanged = false
  private var initialUpdate = true

  // MARK: Helpers
  private func convertAlignment(_ alignment: Alignment?) -> RiveAlignment? {
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

  private func convertFit(_ fit: Fit?) -> RiveFit? {
    guard let fit = fit else { return nil }

    switch fit {
    case .fill: return .fill
    case .contain: return .contain
    case .cover: return .cover
    case .fitwidth: return .fitWidth
    case .fitheight: return .fitHeight
    case .none: return .noFit
    case .scaledown: return .scaleDown
    case .layout: return .layout
    }
  }
}

extension HybridRiveView {
  func logged(tag: String, note: String? = nil, _ fn: () throws -> Void) {
    do {
      return try fn()
    } catch (let e) {
      let errorType = detectErrorType(e)
      let errorMessage = "[RIVE] \(tag) \(note ?? "") \(e)"

      let riveError = RiveError(
        message: errorMessage,
        type: errorType
      )
      onError(riveError)
    }
  }

  private func detectErrorType(_ error: Error) -> RiveErrorType {
    if case NativeRiveError.instanceNotFound = error {
      return .databindingerror
    }

    let nsError = error as NSError
    guard let errorName = nsError.userInfo["name"] as? String else {
      return .unknown
    }

    switch errorName {
    case "NoArtboardFound":
      return .incorrectartboardname
    case "NoStateMachineFound":
      return .incorrectstatemachinename
    case "NoAnimationFound":
      return .incorrectanimationname
    case "Malformed":
      return .malformedfile
    case "FileNotFound":
      return .filenotfound
    case "NoStateMachineInputFound":
      return .incorrectanimationname
    case "TextRunNotFoundError":
      return .textrunnotfounderror
    case "DataBindingError":
      return .databindingerror
    default:
      return .unknown
    }
  }
}
