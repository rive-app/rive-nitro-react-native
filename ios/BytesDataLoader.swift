import Foundation

final class BytesDataLoader: DataLoader {
  func load(from source: DataSource) async throws -> Data {
    guard case .bytes(let data) = source else {
      throw DataLoaderError.invalidSource
    }
    return data
  }
}
