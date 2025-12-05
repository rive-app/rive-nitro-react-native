import Foundation

final class FileDataLoader: DataLoader {
  func load(from source: DataSource) async throws -> Data {
    guard case .file(let url) = source else {
      throw DataLoaderError.invalidSource
    }
    return try loadData(from: url)
  }

  func loadData(from url: URL) throws -> Data {
    guard FileManager.default.fileExists(atPath: url.path) else {
      throw DataLoaderError.fileNotFound(path: url.path)
    }
    return try Data(contentsOf: url)
  }

  func loadData(from path: String) throws -> Data {
    guard let url = URL(string: path), url.isFileURL else {
      throw DataLoaderError.invalidURL(path)
    }
    return try loadData(from: url)
  }
}
