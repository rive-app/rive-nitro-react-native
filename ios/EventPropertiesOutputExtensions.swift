import Foundation

extension EventPropertiesOutput {
  static func boolean(_ value: Bool) -> EventPropertiesOutput {
    return .first(value)
  }

  static func string(_ value: String) -> EventPropertiesOutput {
    return .second(value)
  }

  static func number(_ value: Double) -> EventPropertiesOutput {
    return .third(value)
  }
}
