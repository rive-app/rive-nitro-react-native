import Foundation

final class HTTPDataLoader: DataLoader {
  static let shared = HTTPDataLoader()

  func load(from source: DataSource) async throws -> Data {
    guard case .http(let url) = source else {
      throw DataLoaderError.invalidSource
    }
    return try await downloadData(from: url)
  }

  func downloadData(from url: URL) async throws -> Data {
    let (data, response) = try await URLSession.shared.data(from: url)

    if let httpResponse = response as? HTTPURLResponse,
      !(200...299).contains(httpResponse.statusCode)
    {
      throw DataLoaderError.httpError(statusCode: httpResponse.statusCode, url: url)
    }

    return data
  }

  func downloadData(from urlString: String) async throws -> Data {
    guard let url = URL(string: urlString) else {
      throw DataLoaderError.invalidURL(urlString)
    }
    return try await downloadData(from: url)
  }
}
