import CoreText
import NitroModules
import RiveRuntime

class HybridRiveFontConfig: HybridRiveFontConfigSpec {
  private static var systemFallbackEnabled = false
  private static var customFonts: [UIFont] = []

  func enableSystemFontFallback() throws -> Promise<Void> {
    return Promise.async {
      Self.ensureSystemFallback()
    }
  }

  func addFallbackFont(bytes: ArrayBuffer) throws -> Promise<Void> {
    return Promise.async {
      Self.ensureSystemFallback()
      let data = bytes.toData(copyIfNeeded: true)
      let font = try Self.createUIFont(from: data)
      Self.customFonts.append(font)
    }
  }

  func addFallbackFontFromResource(resource: String) throws -> Promise<Void> {
    return Promise.async {
      Self.ensureSystemFallback()
      let nsResource = resource as NSString
      let name = nsResource.deletingPathExtension
      let ext = nsResource.pathExtension.isEmpty ? nil : nsResource.pathExtension

      guard let path = Bundle.main.path(forResource: name, ofType: ext) else {
        throw RuntimeError.error(withMessage: "Font resource not found: \(resource)")
      }
      let data = try Data(contentsOf: URL(fileURLWithPath: path))
      let font = try Self.createUIFont(from: data)
      Self.customFonts.append(font)
    }
  }

  func addFallbackFontFromURL(url: String) throws -> Promise<Void> {
    return Promise.async {
      Self.ensureSystemFallback()
      guard let parsedURL = URL(string: url) else {
        throw RuntimeError.error(withMessage: "Invalid font URL: \(url)")
      }
      let (data, _) = try await URLSession.shared.data(from: parsedURL)
      let font = try Self.createUIFont(from: data)
      Self.customFonts.append(font)
    }
  }

  func addFallbackFontByName(name: String) throws -> Promise<Void> {
    return Promise.async {
      Self.ensureSystemFallback()
      guard let font = UIFont(name: name, size: UIFont.systemFontSize) else {
        throw RuntimeError.error(withMessage: "System font not found: \(name)")
      }
      Self.customFonts.append(font)
    }
  }

  func applyFallbackFonts() throws -> Promise<Void> {
    return Promise.async {
      Self.updateFallbackFonts()
    }
  }

  func clearCustomFallbackFonts() throws -> Promise<Void> {
    return Promise.async {
      Self.customFonts.removeAll()
      Self.updateFallbackFonts()
    }
  }

  private static func ensureSystemFallback() {
    guard !systemFallbackEnabled else { return }
    _ = RiveFont.self
    systemFallbackEnabled = true
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
      // Ignore "already registered" errors
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

  private static func updateFallbackFonts() {
    var providers: [RiveFallbackFontProvider] = customFonts
    providers.append(RiveFallbackFontDescriptor())
    RiveFont.fallbackFonts = providers
  }
}
