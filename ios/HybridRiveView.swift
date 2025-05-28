import Foundation
import UIKit
import RiveRuntime
import NitroModules

private struct DefaultConfiguration {
  static let autoBind = false
  static let autoPlay = true
  static let alignment = RiveAlignment.center
  static let fit = RiveFit.contain
}

class HybridRiveView : HybridRiveViewSpec {
  // MARK: View Props
  var artboardName: String? { didSet { needsReload = true } }
  var stateMachineName: String? { didSet { needsReload = true } }
  var autoBind: Bool? { didSet { needsReload = true } }
  var autoPlay: Bool? { didSet { needsReload = true } }
  var file: (any HybridRiveFileSpec) = HybridRiveFile() {
    didSet { needsReload = true }
  }
  var alignment: Alignment?
  var fit: Fit?
  
  func awaitViewReady() throws -> Promise<Bool> {
    return Promise.async { [self] in
      return try await getRiveView().awaitViewReady()
    }
  }
  
  func bindViewModelInstance(viewModelInstance: (any HybridViewModelInstanceSpec)) throws {
    guard let viewModelInstance = (viewModelInstance as? HybridViewModelInstance)?.viewModelInstance else { return }
    try getRiveView().bindViewModelInstance(viewModelInstance: viewModelInstance)
  }
  
  func play() throws { try getRiveView().play() }
  
  func pause() throws { try getRiveView().pause() }
  
  func onEventListener(onEvent: @escaping (RiveEvent) -> Void) throws {
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
    return try getRiveView().getBooleanInputValue(name: name, path: path)  }
  
  func triggerInput(name: String, path: String?) throws {
    try getRiveView().triggerInput(name: name, path: path)
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
    guard let file = (file as? HybridRiveFile)?.riveFile else { return }
    
    let config = ViewConfiguration(
      artboardName: artboardName,
      stateMachineName: stateMachineName,
      autoBind: autoBind ?? DefaultConfiguration.autoBind,
      autoPlay: autoPlay ?? DefaultConfiguration.autoPlay,
      riveFile: file,
      alignment: convertAlignment(alignment) ?? DefaultConfiguration.alignment,
      fit: convertFit(fit) ?? DefaultConfiguration.fit
    )
    
    try? getRiveView().configure(config, reload: needsReload)
    needsReload = false
  }
  
  // MARK: Internal State
  private var needsReload = false
  
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
