import UIKit
import RiveRuntime
import NitroModules

struct ViewConfiguration {
  let artboardName: String?
  let stateMachineName: String?
  let autoBind: Bool
  let autoPlay: Bool
  let riveFile: RiveFile
  let alignment: RiveRuntime.RiveAlignment
  let fit: RiveRuntime.RiveFit
}

class RiveReactNativeView: UIView, RiveStateMachineDelegate {
  // MARK: Internal Properties
  private var riveView: RiveView?
  private var baseViewModel: RiveViewModel?
  private var eventListeners: [(RiveEvent) -> Void] = []
  
  // MARK: Public Config Properties
  var autoPlay: Bool = true
  
  // MARK: - Public Methods
  func bindViewModelInstance(viewModelInstance: RiveDataBindingViewModel.Instance) {
    baseViewModel?.riveModel?.stateMachine?.bind(viewModelInstance: viewModelInstance)
  }
  
  func play() {
    baseViewModel?.play()
  }
  
  func pause() {
    baseViewModel?.pause()
  }
  
  func addEventListener(_ onEvent: @escaping (RiveEvent) -> Void) {
    eventListeners.append(onEvent)
  }
  
  func removeEventListeners() {
    eventListeners.removeAll()
  }
  
  func configure(_ config: ViewConfiguration, reload: Bool = false) {
    if reload {
      cleanup()
      let model = RiveModel(riveFile: config.riveFile)
      baseViewModel = RiveViewModel(model, autoPlay: config.autoPlay)
      createViewFromViewModel()
    }
    
    baseViewModel?.alignment = config.alignment
    baseViewModel?.fit = config.fit
    baseViewModel?.autoPlay = config.autoPlay
  }
  
  // MARK: - Internal
  deinit {
    cleanup()
  }
  
  private func createViewFromViewModel() {
    riveView = baseViewModel?.createRiveView()
    
    if let riveView = riveView {
      riveView.translatesAutoresizingMaskIntoConstraints = false
      addSubview(riveView)
      riveView.stateMachineDelegate = self
      NSLayoutConstraint.activate([
        riveView.leadingAnchor.constraint(equalTo: leadingAnchor),
        riveView.trailingAnchor.constraint(equalTo: trailingAnchor),
        riveView.topAnchor.constraint(equalTo: topAnchor),
        riveView.bottomAnchor.constraint(equalTo: bottomAnchor)
      ])
    }
  }
  
  private func cleanup() {
    riveView?.removeFromSuperview()
    riveView?.stateMachineDelegate = nil
    riveView = nil
    baseViewModel = nil
  }
  
  @objc func onRiveEventReceived(onRiveEvent riveEvent: RiveRuntime.RiveEvent) {
    let eventType = RiveEvent(
      name: riveEvent.name(),
      type: riveEvent is RiveRuntime.RiveOpenUrlEvent ? RiveEventType.openurl : RiveEventType.general,
      delay: Double(riveEvent.delay()),
      properties: convertEventProperties(riveEvent.properties()),
      url: (riveEvent as? RiveRuntime.RiveOpenUrlEvent)?.url(),
      target: (riveEvent as? RiveRuntime.RiveOpenUrlEvent)?.target()
    )
    
    for listener in eventListeners {
      listener(eventType)
    }
  }
  
  private func convertEventProperties(_ properties: Dictionary<String, Any>?) -> AnyMapHolder?{
    guard let properties = properties else { return nil }
    
    let newMap = AnyMapHolder()
    
    for (key, value) in properties {
      if let string = value as? String {
        newMap.setString(key: key, value: string)
      } else if let number = value as? NSNumber {
        newMap.setDouble(key: key, value: number.doubleValue)
      } else if let boolean = value as? Bool {
        newMap.setBoolean(key: key, value: boolean)
      }
    }
    
    return newMap
  }
}
