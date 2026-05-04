import RiveRuntime
import NitroModules

enum AssetType {
  case image
  case font
  case audio

  init(from riveAssetType: RiveAssetType) {
    switch riveAssetType {
    case .image: self = .image
    case .font:  self = .font
    case .audio: self = .audio
    }
  }

  /// Initialise by guessing from a file-name suffix.
  /// Deprecated: provide `type` explicitly instead.
  init?(fromName name: String) {
    let lowercased = name.lowercased()
    if lowercased.hasSuffix(".png") || lowercased.hasSuffix(".jpg") || lowercased.hasSuffix(".jpeg") || lowercased.hasSuffix(".webp") {
      self = .image
    } else if lowercased.hasSuffix(".ttf") || lowercased.hasSuffix(".otf") {
      self = .font
    } else if lowercased.hasSuffix(".wav") || lowercased.hasSuffix(".mp3") || lowercased.hasSuffix(".flac") || lowercased.hasSuffix(".ogg") {
      self = .audio
    } else {
      return nil
    }
  }
}

@MainActor
final class AssetLoader {

  static func registerAssets(
    _ referencedAssets: ReferencedAssetsType?,
    on worker: Worker
  ) async {
    guard let assets = referencedAssets?.data else { return }

    await withTaskGroup(of: Void.self) { group in
      for (name, asset) in assets {
        group.addTask { @MainActor in
          await self.loadAndRegisterAsset(name: name, asset: asset, worker: worker)
        }
      }
    }
  }

  private static func loadAndRegisterAsset(
    name: String,
    asset: ResolvedReferencedAsset,
    worker: Worker
  ) async {
    do {
      let data = try await loadAssetData(asset)
      guard !data.isEmpty else { return }

      // Prefer an explicit type provided by the caller.
      let resolvedType: AssetType?
      if let riveType = asset.type {
        resolvedType = AssetType(from: riveType)
      } else {
        // No explicit type — fall back to extension / magic-byte inference.
        // Deprecated: set type on the asset entry to silence this warning.
        RCTLogWarn("[Rive] No type provided for '\(name)'. Falling back to extension/magic-byte inference — " +
          "set type: 'image' | 'font' | 'audio' on the asset to silence this warning.")
        resolvedType = AssetType(fromName: name) ?? inferAssetType(from: asset, data: data)
      }
      guard let resolvedType else {
        RCTLogWarn("[Rive] Could not determine asset type for: \(name)")
        return
      }

      try await registerAsset(data: data, name: name, type: resolvedType, worker: worker)
    } catch {
      RCTLogError("Failed to load asset '\(name)': \(error)")
    }
  }

  private static func loadAssetData(_ asset: ResolvedReferencedAsset) async throws -> Data {
    guard let dataSource = try DataSourceResolver.resolve(from: asset) else {
      return Data()
    }
    return try await dataSource.createLoader().load(from: dataSource)
  }

  private static func inferAssetType(from asset: ResolvedReferencedAsset, data: Data) -> AssetType? {
    if let sourceUrl = asset.sourceUrl {
      if let type = AssetType(fromName: sourceUrl) {
        return type
      }
    }
    if let sourceAsset = asset.sourceAsset {
      if let type = AssetType(fromName: sourceAsset) {
        return type
      }
    }
    if let sourceAssetId = asset.sourceAssetId {
      if let type = AssetType(fromName: sourceAssetId) {
        return type
      }
    }

    return inferAssetTypeFromMagicBytes(data)
  }

  private static func inferAssetTypeFromMagicBytes(_ data: Data) -> AssetType? {
    guard data.count >= 4 else { return nil }
    let bytes = [UInt8](data.prefix(min(data.count, 12)))

    // PNG: 89 50 4E 47
    if bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47 {
      return .image
    }
    // JPEG: FF D8 FF
    if bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF {
      return .image
    }
    // RIFF container: WebP (image) vs WAV (audio)
    if bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 && bytes.count >= 12 {
      // bytes 8-11 identify the format: WEBP or WAVE
      if bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50 {
        return .image  // RIFF....WEBP
      }
      if bytes[8] == 0x57 && bytes[9] == 0x41 && bytes[10] == 0x56 && bytes[11] == 0x45 {
        return .audio  // RIFF....WAVE
      }
    }
    // OGG: 4F 67 67 53
    if bytes[0] == 0x4F && bytes[1] == 0x67 && bytes[2] == 0x67 && bytes[3] == 0x53 {
      return .audio
    }
    // FLAC: 66 4C 61 43
    if bytes[0] == 0x66 && bytes[1] == 0x4C && bytes[2] == 0x61 && bytes[3] == 0x43 {
      return .audio
    }
    // MP3: FF FB, FF F3, FF F2 (sync word), or ID3 tag
    if bytes[0] == 0xFF && (bytes[1] == 0xFB || bytes[1] == 0xF3 || bytes[1] == 0xF2) {
      return .audio
    }
    if bytes[0] == 0x49 && bytes[1] == 0x44 && bytes[2] == 0x33 {
      return .audio  // ID3 tag header
    }
    // TrueType: 00 01 00 00
    if bytes[0] == 0x00 && bytes[1] == 0x01 && bytes[2] == 0x00 && bytes[3] == 0x00 {
      return .font
    }
    // OpenType: 4F 54 54 4F ("OTTO")
    if bytes[0] == 0x4F && bytes[1] == 0x54 && bytes[2] == 0x54 && bytes[3] == 0x4F {
      return .font
    }

    return nil
  }

  private static func registerAsset(
    data: Data,
    name: String,
    type: AssetType,
    worker: Worker
  ) async throws {
    switch type {
    case .image:
      worker.removeGlobalImageAsset(name: name)
      let image = try await worker.decodeImage(from: data)
      worker.addGlobalImageAsset(image, name: name)

    case .font:
      worker.removeGlobalFontAsset(name)
      let font = try await worker.decodeFont(from: data)
      worker.addGlobalFontAsset(font, name: name)

    case .audio:
      worker.removeGlobalAudioAsset(name: name)
      let audio = try await worker.decodeAudio(from: data)
      worker.addGlobalAudioAsset(audio, name: name)
    }
  }
}
