import Foundation
import UIKit
import RiveRuntime

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
  
  // MARK: View Methods
  func bindViewModelInstance(viewModelInstance: (any HybridViewModelInstanceSpec)) throws {
    guard let viewModelInstance = (viewModelInstance as? HybridViewModelInstance)?.viewModelInstance else { return }
    riveView?.bindViewModelInstance(viewModelInstance: viewModelInstance)
  }
  func play() throws { riveView?.play() }
  func pause() throws { riveView?.pause() }
  
  // MARK: Views
  var view: UIView = RiveReactNativeView()
  var riveView: RiveReactNativeView? { view as? RiveReactNativeView }
  
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
    
    riveView?.configure(config, reload: needsReload)
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
