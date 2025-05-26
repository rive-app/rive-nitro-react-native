import UIKit
import RiveRuntime

struct ViewConfiguration {
  let artboardName: String?
  let stateMachineName: String?
  let autoBind: Bool
  let autoPlay: Bool
  let riveFile: RiveFile
  let alignment: RiveRuntime.RiveAlignment
  let fit: RiveRuntime.RiveFit
}

class RiveReactNativeView: UIView {
  // MARK: Internal Properties
  private var riveView: RiveView?
  private var baseViewModel: RiveViewModel?
  
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
  
  public func configure(_ config: ViewConfiguration, reload: Bool = false){
    if (reload) {
      let model = RiveModel(riveFile: config.riveFile)
      baseViewModel = RiveViewModel(model, autoPlay: config.autoPlay)
      riveView = baseViewModel?.createRiveView()
      if let riveView = riveView {
        riveView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(riveView)
        NSLayoutConstraint.activate([
          riveView.leadingAnchor.constraint(equalTo: leadingAnchor),
          riveView.trailingAnchor.constraint(equalTo: trailingAnchor),
          riveView.topAnchor.constraint(equalTo: topAnchor),
          riveView.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])
      }
    }
    
    baseViewModel?.alignment = config.alignment
    baseViewModel?.fit = config.fit
    baseViewModel?.autoPlay = config.autoPlay
  }
  
  // MARK: - Internal
}
