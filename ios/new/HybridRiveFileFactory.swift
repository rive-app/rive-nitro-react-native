@_spi(RiveExperimental) import RiveRuntime
import NitroModules

final class HybridRiveFileFactory: HybridRiveFileFactorySpec, @unchecked Sendable {
  var backend: String { "experimental" }

  // All files must share the same Worker so artboard handles are valid across files
  // (each Worker has its own C++ command server with its own m_artboards map)
  private static let sharedWorkerTask = Task { @MainActor in try await Worker() }

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
      let worker = try await HybridRiveFileFactory.sharedWorkerTask.value
      RCTLog("[HybridRiveFileFactory] fromURL: got shared worker")
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
      let worker = try await HybridRiveFileFactory.sharedWorkerTask.value
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
      let worker = try await HybridRiveFileFactory.sharedWorkerTask.value
      await ExperimentalAssetLoader.registerAssets(referencedAssets, on: worker)
      let file = try await File(source: .local(resource, nil), worker: worker)
      return HybridRiveFile(file: file, worker: worker)
    }
  }

  func fromBytes(bytes: ArrayBuffer, loadCdn: Bool, referencedAssets: ReferencedAssetsType?)
    throws -> Promise<(any HybridRiveFileSpec)>
  {
    let data = bytes.toData(copyIfNeeded: true)
    RCTLog("[HybridRiveFileFactory] fromBytes: got \(data.count) bytes")
    return Promise.async {
      let worker = try await HybridRiveFileFactory.sharedWorkerTask.value
      RCTLog("[HybridRiveFileFactory] fromBytes: got shared worker")
      await ExperimentalAssetLoader.registerAssets(referencedAssets, on: worker)
      let file = try await File(source: .data(data), worker: worker)
      RCTLog("[HybridRiveFileFactory] fromBytes: created file")
      return HybridRiveFile(file: file, worker: worker)
    }
  }
}
