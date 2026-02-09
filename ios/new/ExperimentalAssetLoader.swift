@_spi(RiveExperimental) import RiveRuntime
import NitroModules

enum AssetType {
  case image
  case font
  case audio

  init?(fromName name: String) {
    let lowercased = name.lowercased()
    if lowercased.contains("image") || lowercased.hasSuffix(".png") || lowercased.hasSuffix(".jpg") || lowercased.hasSuffix(".jpeg") || lowercased.hasSuffix(".webp") {
      self = .image
    } else if lowercased.contains("font") || lowercased.hasSuffix(".ttf") || lowercased.hasSuffix(".otf") {
      self = .font
    } else if lowercased.contains("audio") || lowercased.hasSuffix(".wav") || lowercased.hasSuffix(".mp3") || lowercased.hasSuffix(".flac") || lowercased.hasSuffix(".ogg") {
      self = .audio
    } else {
      return nil
    }
  }
}

@MainActor
final class ExperimentalAssetLoader {

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

      let assetType = AssetType(fromName: name) ?? inferAssetType(from: asset, data: data)
      guard let assetType = assetType else {
        RCTLogWarn("Could not determine asset type for: \(name)")
        return
      }

      try await registerAsset(data: data, name: name, type: assetType, worker: worker)
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

    // Try to infer from data magic bytes
    if data.count >= 4 {
      let bytes = [UInt8](data.prefix(4))
      // PNG: 89 50 4E 47
      if bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47 {
        return .image
      }
      // JPEG: FF D8 FF
      if bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF {
        return .image
      }
      // WebP: RIFF....WEBP
      if bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 {
        return .image
      }
    }

    return nil
  }

  private static func registerAsset(
    data: Data,
    name: String,
    type: AssetType,
    worker: Worker
  ) async throws {
    RCTLogInfo("ExperimentalAssetLoader: Registering \(type) asset '\(name)' (\(data.count) bytes)")
    switch type {
    case .image:
      worker.removeGlobalImageAsset(name: name)
      let image = try await worker.decodeImage(from: data)
      worker.addGlobalImageAsset(image, name: name)
      RCTLogInfo("ExperimentalAssetLoader: Image '\(name)' registered successfully")

    case .font:
      worker.removeGlobalFontAsset(name)
      let font = try await worker.decodeFont(from: data)
      worker.addGlobalFontAsset(font, name: name)
      RCTLogInfo("ExperimentalAssetLoader: Font '\(name)' registered successfully")

    case .audio:
      worker.removeGlobalAudioAsset(name: name)
      let audio = try await worker.decodeAudio(from: data)
      worker.addGlobalAudioAsset(audio, name: name)
      RCTLogInfo("ExperimentalAssetLoader: Audio '\(name)' registered successfully")
    }
  }
}
