import Foundation

extension EventPropertiesOutput {
  static func boolean(_ value: Bool) -> EventPropertiesOutput {
    return .first(value)
  }

  static func string(_ value: String) -> EventPropertiesOutput {
    return .third(value)
  }

  static func number(_ value: Double) -> EventPropertiesOutput {
    return .second(value)
  }
}
