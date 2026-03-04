import CoreText
import NitroModules
import RiveRuntime

class HybridRiveFontConfig: HybridRiveFontConfigSpec {
  private static let defaultWeight = 0
  private static var fontsByWeight: [Int: [any HybridFallbackFontSpec]] = [:]

  func loadFontFromURL(url: String) throws -> Promise<(any HybridFallbackFontSpec)> {
    return Promise.async {
      guard let parsedURL = URL(string: url) else {
        throw RuntimeError.error(withMessage: "Invalid font URL: \(url)")
      }
      let (data, _) = try await URLSession.shared.data(from: parsedURL)
      let font = try Self.createUIFont(from: data)
      return HybridFallbackFont(font: font)
    }
  }

  func loadFontFromResource(resource: String) throws -> (any HybridFallbackFontSpec) {
    let nsResource = resource as NSString
    let name = nsResource.deletingPathExtension
    let ext = nsResource.pathExtension.isEmpty ? nil : nsResource.pathExtension

    guard let path = Bundle.main.path(forResource: name, ofType: ext) else {
      throw RuntimeError.error(withMessage: "Font resource not found: \(resource)")
    }
    let data = try Data(contentsOf: URL(fileURLWithPath: path))
    let font = try Self.createUIFont(from: data)
    return HybridFallbackFont(font: font)
  }

  func loadFontFromBytes(bytes: ArrayBuffer) throws -> (any HybridFallbackFontSpec) {
    let data = bytes.toData(copyIfNeeded: true)
    let font = try Self.createUIFont(from: data)
    return HybridFallbackFont(font: font)
  }

  func loadFontByName(name: String) throws -> (any HybridFallbackFontSpec) {
    guard let font = UIFont(name: name, size: UIFont.systemFontSize) else {
      throw RuntimeError.error(withMessage: "System font not found: \(name)")
    }
    return HybridFallbackFont(font: font)
  }

  func getSystemDefaultFont() throws -> (any HybridFallbackFontSpec) {
    return HybridDefaultFallbackFont()
  }

  func setFontsForWeight(weight: Double, fonts: [(any HybridFallbackFontSpec)]) throws {
    let key = Int(weight)
    Self.fontsByWeight[key] = fonts
  }

  func applyFallbackFonts() throws -> Promise<Void> {
    return Promise.async {
      _ = RiveFont.self
      RiveFont.fallbackFontsCallback = { weight in
        let requestedWeight = Int(weight.rawWeight)
        let specs = Self.fontsByWeight[requestedWeight] ?? Self.fontsByWeight[Self.defaultWeight] ?? []
        return specs.compactMap { spec in
          if spec is HybridDefaultFallbackFont {
            return RiveFallbackFontDescriptor()
          } else if let fallbackFont = spec as? HybridFallbackFont {
            return fallbackFont.font
          } else {
            print("[RiveFonts] Unknown fallback font spec type: \(type(of: spec))")
            return nil
          }
        }
      }
    }
  }

  func clearFallbackFonts() throws -> Promise<Void> {
    return Promise.async {
      Self.fontsByWeight.removeAll()
      RiveFont.fallbackFontsCallback = { _ in [RiveFallbackFontDescriptor()] }
      RiveFont.fallbackFonts = [RiveFallbackFontDescriptor()]
    }
  }

  private static func createUIFont(from data: Data) throws -> UIFont {
    guard let provider = CGDataProvider(data: data as CFData),
      let cgFont = CGFont(provider)
    else {
      throw RuntimeError.error(withMessage: "Failed to decode font data")
    }

    var error: Unmanaged<CFError>?
    if !CTFontManagerRegisterGraphicsFont(cgFont, &error) {
      let cfError = error?.takeRetainedValue()
      let domain = cfError.map { CFErrorGetDomain($0) as String } ?? ""
      if domain != kCTFontManagerErrorDomain as String {
        throw RuntimeError.error(
          withMessage: "Failed to register font: \(cfError?.localizedDescription ?? "unknown error")"
        )
      }
    }

    guard let fontName = cgFont.postScriptName as String? else {
      throw RuntimeError.error(withMessage: "Failed to get font name from data")
    }
    guard let font = UIFont(name: fontName, size: UIFont.systemFontSize) else {
      throw RuntimeError.error(withMessage: "Failed to create UIFont for: \(fontName)")
    }
    return font
  }
}
