import Foundation

enum DataLoaderError: Error, LocalizedError {
  case invalidSource
  case invalidURL(String)
  case httpError(statusCode: Int, url: URL)
  case resourceNotFound(resource: String)
  case fileNotFound(path: String)

  var errorDescription: String? {
    switch self {
    case .invalidSource:
      return "Invalid data source type for this loader"
    case .invalidURL(let url):
      return "Invalid URL: \(url)"
    case .httpError(let code, let url):
      return "HTTP error \(code) for \(url)"
    case .resourceNotFound(let resource):
      return "Resource not found: \(resource)"
    case .fileNotFound(let path):
      return "File not found: \(path)"
    }
  }
}

protocol DataLoader {
  func load(from source: DataSource) async throws -> Data
}
