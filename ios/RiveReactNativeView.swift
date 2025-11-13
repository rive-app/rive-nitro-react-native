import UIKit
import RiveRuntime
import NitroModules

protocol RiveViewSource: AnyObject {
  func registerView(_ view: RiveReactNativeView)
  func unregisterView(_ view: RiveReactNativeView)
}

struct ViewConfiguration {
  let artboardName: String?
  let stateMachineName: String?
  let autoBind: Bool
  let autoPlay: Bool
  let riveFile: RiveFile
  let viewSource: RiveViewSource?
  let alignment: RiveRuntime.RiveAlignment
  let fit: RiveRuntime.RiveFit
  let layoutScaleFactor: Double
  let bind: RiveDataBindingViewModel.Instance?
}

class RiveReactNativeView: UIView, RiveStateMachineDelegate {
  // MARK: Internal Properties
  private var riveView: RiveView?
  private var baseViewModel: RiveViewModel?
  private var eventListeners: [(UnifiedRiveEvent) -> Void] = []
  private var viewReadyContinuation: CheckedContinuation<Void, Never>?
  private var isViewReady = false
  private weak var viewSource: RiveViewSource?

  // MARK: Public Config Properties
  var autoPlay: Bool = true
  
  // MARK: - Public Methods
  
  func awaitViewReady()async -> Bool {
    if !isViewReady {
      await withCheckedContinuation { continuation in
        viewReadyContinuation = continuation
      }
      return true
    }
    return true
  }
  
  func configure(_ config: ViewConfiguration, reload: Bool = false) {
    if reload {
      cleanup()
      let model = RiveModel(riveFile: config.riveFile)
      baseViewModel = RiveViewModel(model, autoPlay: config.autoPlay)
      createViewFromViewModel()

      if let viewSource = config.viewSource {
        self.viewSource = viewSource
        viewSource.registerView(self)
      }
    }

    baseViewModel?.alignment = config.alignment
    baseViewModel?.fit = config.fit
    baseViewModel?.autoPlay = config.autoPlay
    baseViewModel?.layoutScaleFactor = config.layoutScaleFactor

    if !isViewReady {
      isViewReady = true
      viewReadyContinuation?.resume()
      viewReadyContinuation = nil
    }
    
    if let bind = config.bind {
      baseViewModel?.riveModel?.stateMachine?.bind(viewModelInstance: bind)
    }
  }
  
  func bindViewModelInstance(viewModelInstance: RiveDataBindingViewModel.Instance) {
    baseViewModel?.riveModel?.stateMachine?.bind(viewModelInstance: viewModelInstance)
  }
  
  func play() {
    baseViewModel?.play()
  }
  
  func pause() {
    baseViewModel?.pause()
  }

  func refreshAfterAssetChange() {
    if baseViewModel?.isPlaying == false {
      baseViewModel?.play()
    }
  }

  func addEventListener(_ onEvent: @escaping (UnifiedRiveEvent) -> Void) {
    eventListeners.append(onEvent)
  }
  
  func removeEventListeners() {
    eventListeners.removeAll()
  }
  
  func setNumberInputValue(name: String, value: Float, path: String?) throws {
    try handleInput(name: name, path: path, type: .number) { (input: RiveRuntime.RiveSMINumber) in
      input.setValue(value)
    }
  }
  
  func getNumberInputValue(name: String, path: String?) throws -> Float {
    try handleInput(name: name, path: path, type: .number) { (input: RiveRuntime.RiveSMINumber) in
      input.value()
    }
  }
  
  func setBooleanInputValue(name: String, value: Bool, path: String?) throws {
    try handleInput(name: name, path: path, type: .boolean) { (input: RiveRuntime.RiveSMIBool) in
      input.setValue(value)
    }
  }
  
  func getBooleanInputValue(name: String, path: String?) throws -> Bool {
    try handleInput(name: name, path: path, type: .boolean) { (input: RiveRuntime.RiveSMIBool) in
      input.value()
    }
  }
  
  func triggerInput(name: String, path: String?) throws {
    try handleInput(name: name, path: path, type: .trigger) { (input: RiveRuntime.RiveSMITrigger) in
      input.fire()
    }
  }
  
  func setTextRunValue(name: String, value: String, path: String?) throws {
    let textRun = try textRunOptionPath(name: name, path: path)
    textRun.setText(value)
  }
  
  func getTextRunValue(name: String, path: String?) throws -> String {
    let textRun = try textRunOptionPath(name: name, path: path)
    return textRun.text()
  }
  
  private func textRunOptionPath(name: String, path: String?) throws -> RiveRuntime.RiveTextValueRun {
    let textRun: RiveRuntime.RiveTextValueRun?
    if let path = path {
      textRun = baseViewModel?.riveModel?.artboard?.textRun(name, path: path)
    } else {
      textRun = baseViewModel?.riveModel?.artboard?.textRun(name)
    }
    
    guard let textRun = textRun else {
      throw RuntimeError.error(withMessage: "Could not find text run `\(name)`\(path.map { " at path `\($0)`" } ?? "")")
    }
    
    return textRun
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
    if let viewSource = viewSource {
      viewSource.unregisterView(self)
      self.viewSource = nil
    }
  }
  
  @objc func onRiveEventReceived(onRiveEvent riveEvent: RiveRuntime.RiveEvent) {
    let eventType = UnifiedRiveEvent(
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
  
  private func convertEventProperties(_ properties: Dictionary<String, Any>?) -> Dictionary<String, EventPropertiesOutput>?{
    guard let properties = properties else { return nil }
    
    var newMap: Dictionary<String, EventPropertiesOutput> = [:]
    
    for (key, value) in properties {
      if let string = value as? String {
        newMap[key] = .string(string)
      } else if let number = value as? NSNumber {
        newMap[key] = .number(number.doubleValue)
      } else if let boolean = value as? Bool {
        newMap[key] = .boolean(boolean)
      }
    }
    
    return newMap
  }
  
  private enum InputType {
    case number
    case boolean
    case trigger
  }
  
  private func handleInput<P: RiveRuntime.RiveSMIInput, T>(name: String, path: String?, type: InputType, onSuccess: (P) throws -> T) throws -> T {
    let input: P?
    if let path = path {
      switch type {
      case .number:
        input = baseViewModel?.riveModel?.artboard?.getNumber(name, path: path) as? P
      case .boolean:
        input = baseViewModel?.riveModel?.artboard?.getBool(name, path: path) as? P
      case .trigger:
        input = baseViewModel?.riveModel?.artboard?.getTrigger(name, path: path) as? P
      }
    } else {
      switch type {
      case .number:
        input = baseViewModel?.numberInput(named: name) as? P
      case .boolean:
        input = baseViewModel?.boolInput(named: name) as? P
      case .trigger:
        input = baseViewModel?.riveModel?.stateMachine?.getTrigger(name) as? P
      }
    }
    
    guard let input = input else {
      throw RuntimeError.error(withMessage: "Could not find input `\(name)`\(path.map { " at path `\($0)`" } ?? "")")
    }
    
    return try onSuccess(input)
  }
}
