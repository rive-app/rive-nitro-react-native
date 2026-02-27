import NitroModules

class HybridFallbackFont: HybridFallbackFontSpec {
  let font: UIFont

  init(font: UIFont) {
    self.font = font
    super.init()
  }
}
