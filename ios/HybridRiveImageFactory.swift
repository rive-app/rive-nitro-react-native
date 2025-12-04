import NitroModules
import RiveRuntime

final class HybridRiveImageFactory: HybridRiveImageFactorySpec {
  func loadFromURLAsync(url: String) throws -> Promise<(any HybridRiveImageSpec)> {
    return Promise.async {
      let data = try await HTTPLoader.shared.downloadData(from: url)

      guard let renderImage = RiveRenderImage(data: data) else {
        throw RuntimeError.error(withMessage: "Failed to decode image from URL: \(url)")
      }

      return HybridRiveImage(renderImage: renderImage, dataSize: data.count)
    }
  }
}
