import NitroModules
import RiveRuntime

final class HybridRiveImageFactory: HybridRiveImageFactorySpec {
  private func loadFromDataSource(_ source: DataSource) -> Promise<(any HybridRiveImageSpec)> {
    return Promise.async {
      let data = try await source.createLoader().load(from: source)
      guard let renderImage = RiveRenderImage(data: data) else {
        throw RuntimeError.error(withMessage: "Failed to decode image")
      }
      return HybridRiveImage(renderImage: renderImage, dataSize: data.count)
    }
  }

  func loadFromURLAsync(url: String) throws -> Promise<(any HybridRiveImageSpec)> {
    return loadFromDataSource(try .fromURL(string: url))
  }

  func loadFromResourceAsync(resource: String) throws -> Promise<(any HybridRiveImageSpec)> {
    return loadFromDataSource(.bundle(nameWithExtension: resource))
  }

  func loadFromBytesAsync(bytes: ArrayBufferHolder) throws -> Promise<(any HybridRiveImageSpec)> {
    return loadFromDataSource(.bytes(from: bytes))
  }
}
