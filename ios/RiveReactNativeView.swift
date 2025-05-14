import UIKit
import RiveRuntime

class RiveReactNativeView: UIView {
  private var riveView: RiveView?
  private var baseViewModel: RiveViewModel?
  
  private let riveUrl = "https://cdn.rive.app/animations/vehicles.riv"
  
  // MARK: - Public Methods
  func play() {
    baseViewModel?.play()
  }
  
  func pause() {
    baseViewModel?.pause()
  }
  
  public func demoSetupRiveView() {
    downloadRiveFile { [weak self] riveFile in
      guard let riveFile = riveFile else { return }
      let model = RiveModel(riveFile: riveFile)
      self?.baseViewModel = RiveViewModel(model)
      self?.riveView = self?.baseViewModel?.createRiveView()
      
      if let riveView = self?.riveView {
        riveView.translatesAutoresizingMaskIntoConstraints = false
        self?.addSubview(riveView)
        NSLayoutConstraint.activate([
          riveView.leadingAnchor.constraint(equalTo: self!.leadingAnchor),
          riveView.trailingAnchor.constraint(equalTo: self!.trailingAnchor),
          riveView.topAnchor.constraint(equalTo: self!.topAnchor),
          riveView.bottomAnchor.constraint(equalTo: self!.bottomAnchor)
        ])
      }
    }
  }
  
  // MARK: - Internal
  private func downloadRiveFile(completion: @escaping (RiveFile?) -> Void) {
    guard let url = URL(string: riveUrl) else {
      completion(nil)
      return
    }
    DispatchQueue.global(qos: .background).async {
      do {
        let riveData = try Data(contentsOf: url)
        let riveFile = try RiveFile(data: riveData, loadCdn: true)
        DispatchQueue.main.async {
          completion(riveFile)
        }
      } catch {
        DispatchQueue.main.async {
          completion(nil)
        }
      }
    }
  }
}
