import NitroModules
import RiveRuntime

final class HybridRiveImageFactory: HybridRiveImageFactorySpec {
  func loadFromURLAsync(url: String) throws -> Promise<(any HybridRiveImageSpec)> {
    return Promise.async {
      guard let requestUrl = URL(string: url) else {
        throw RuntimeError.error(withMessage: "Invalid URL: \(url)")
      }

      let (data, response) = try await URLSession.shared.data(from: requestUrl)

      if let httpResponse = response as? HTTPURLResponse,
        !(200...299).contains(httpResponse.statusCode)
      {
        throw RuntimeError.error(
          withMessage: "Failed to load image from URL: \(url) (status: \(httpResponse.statusCode))")
      }

      guard let renderImage = RiveRenderImage(data: data) else {
        throw RuntimeError.error(withMessage: "Failed to decode image from URL: \(url)")
      }

      return HybridRiveImage(renderImage: renderImage, dataSize: data.count)
    }
  }
}
