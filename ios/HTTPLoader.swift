import Foundation

enum HTTPLoaderError: Error, LocalizedError {
  case invalidURL(String)
  case httpError(statusCode: Int, url: URL)

  var errorDescription: String? {
    switch self {
    case .invalidURL(let url):
      return "Invalid URL: \(url)"
    case .httpError(let code, let url):
      return "HTTP error \(code) for \(url)"
    }
  }
}

final class HTTPLoader {
  static let shared = HTTPLoader()

  func downloadData(from url: URL) async throws -> Data {
    let (data, response) = try await URLSession.shared.data(from: url)

    if let httpResponse = response as? HTTPURLResponse,
      !(200...299).contains(httpResponse.statusCode)
    {
      throw HTTPLoaderError.httpError(statusCode: httpResponse.statusCode, url: url)
    }

    return data
  }

  func downloadData(from urlString: String) async throws -> Data {
    guard let url = URL(string: urlString) else {
      throw HTTPLoaderError.invalidURL(urlString)
    }
    return try await downloadData(from: url)
  }
}
