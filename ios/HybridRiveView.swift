import Foundation
import UIKit

class HybridRiveView : HybridRiveViewSpec {
  // MARK: View Props
  var autoBind: Bool = false {
    didSet {
      print("did set auto bind: \(autoBind)")
    }
  }
  
  var autoPlay: Bool = false {
    didSet {
      print("did set auto play: \(autoPlay)")
    }
  }
  
  // MARK: View Methods
  func play() {
    riveView?.play()
  }
  
  func pause() {
    riveView?.pause()
  }
  
  // MARK: View Initializers
  var riveView: RiveReactNativeView? {
    return view as? RiveReactNativeView
  }
  
  var view: UIView = {
    let view = RiveReactNativeView()
    view.demoSetupRiveView()
    return view
  }()
  
  // MARK: Internal
  func beforeUpdate() {
    print("before update")
  }
  
  func afterUpdate() {
    print("after update")
  }
}
