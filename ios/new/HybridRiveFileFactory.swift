@_spi(RiveExperimental) import RiveRuntime
import NitroModules

final class HybridRiveFileFactory: HybridRiveFileFactorySpec, @unchecked Sendable {

  func fromURL(url: String, loadCdn: Bool, referencedAssets: ReferencedAssetsType?) throws
    -> Promise<(any HybridRiveFileSpec)>
  {
    return Promise.async {
      guard let fileURL = URL(string: url) else {
        throw RuntimeError.error(withMessage: "Invalid URL: \(url)")
      }
      RCTLog("[HybridRiveFileFactory] fromURL: downloading \(url)")
      let data = try await HTTPDataLoader.shared.downloadData(from: fileURL)
      RCTLog("[HybridRiveFileFactory] fromURL: downloaded \(data.count) bytes")
      let worker = await Worker()
      RCTLog("[HybridRiveFileFactory] fromURL: created worker")
      await ExperimentalAssetLoader.registerAssets(referencedAssets, on: worker)
      let file = try await File(source: .data(data), worker: worker)
      RCTLog("[HybridRiveFileFactory] fromURL: created file")
      return HybridRiveFile(file: file, worker: worker)
    }
  }

  func fromFileURL(fileURL: String, loadCdn: Bool, referencedAssets: ReferencedAssetsType?) throws
    -> Promise<(any HybridRiveFileSpec)>
  {
    return Promise.async {
      guard let url = URL(string: fileURL) else {
        throw RuntimeError.error(withMessage: "Invalid URL: \(fileURL)")
      }
      guard url.isFileURL else {
        throw RuntimeError.error(withMessage: "fromFileURL: URL must be a file URL: \(fileURL)")
      }
      let data = try FileDataLoader().loadData(from: url)
      let worker = await Worker()
      await ExperimentalAssetLoader.registerAssets(referencedAssets, on: worker)
      let file = try await File(source: .data(data), worker: worker)
      return HybridRiveFile(file: file, worker: worker)
    }
  }

  func fromResource(resource: String, loadCdn: Bool, referencedAssets: ReferencedAssetsType?) throws
    -> Promise<(any HybridRiveFileSpec)>
  {
    return Promise.async {
      guard Bundle.main.path(forResource: resource, ofType: "riv") != nil else {
        throw RuntimeError.error(withMessage: "Could not find Rive file: \(resource).riv")
      }
      let worker = await Worker()
      await ExperimentalAssetLoader.registerAssets(referencedAssets, on: worker)
      let file = try await File(source: .local(resource, nil), worker: worker)
      return HybridRiveFile(file: file, worker: worker)
    }
  }

  func fromBytes(bytes: ArrayBufferHolder, loadCdn: Bool, referencedAssets: ReferencedAssetsType?)
    throws -> Promise<(any HybridRiveFileSpec)>
  {
    let data = bytes.toData(copyIfNeeded: true)
    RCTLog("[HybridRiveFileFactory] fromBytes: got \(data.count) bytes")
    return Promise.async {
      let worker = await Worker()
      RCTLog("[HybridRiveFileFactory] fromBytes: created worker")
      await ExperimentalAssetLoader.registerAssets(referencedAssets, on: worker)
      let file = try await File(source: .data(data), worker: worker)
      RCTLog("[HybridRiveFileFactory] fromBytes: created file")
      return HybridRiveFile(file: file, worker: worker)
    }
  }
}
