import NitroModules
import RiveRuntime

class HybridViewModelColorProperty: HybridViewModelColorPropertySpec, ValuedPropertyProtocol {
  var property: ColorPropertyType!
  lazy var helper = PropertyListenerHelper(property: property!)
  
  init(property: ColorPropertyType) {
    self.property = property
    super.init()
  }

  var value: Double {
    get {
      return property.value.toHexDouble()
    }
    set {
      property.value = UIColor(argb: Int(newValue))
    }
  }
  
  func addListener(onChanged: @escaping (Double) -> Void) throws -> () -> Void {
    return helper.addListener { (color: UIColor) in
      onChanged(color.toHexDouble())
    }
  }
}

extension UIColor {
  convenience init(argb: Int) {
    let alpha = CGFloat((argb >> 24) & 0xFF) / 255.0
    let red   = CGFloat((argb >> 16) & 0xFF) / 255.0
    let green = CGFloat((argb >> 8) & 0xFF) / 255.0
    let blue  = CGFloat(argb & 0xFF) / 255.0
    
    self.init(red: red, green: green, blue: blue, alpha: alpha)
  }
  
  func toHexDouble() -> Double {
    var red: CGFloat = 0
    var green: CGFloat = 0
    var blue: CGFloat = 0
    var alpha: CGFloat = 0
    
    self.getRed(&red, green: &green, blue: &blue, alpha: &alpha)
    
    let r = UInt32(red * 255)
    let g = UInt32(green * 255)
    let b = UInt32(blue * 255)
    let a = UInt32(alpha * 255)
    
    return Double((a << 24) | (r << 16) | (g << 8) | b)
  }
}
