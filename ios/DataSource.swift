import Foundation
import NitroModules

enum DataSource {
  case http(url: URL)
  case file(url: URL)
  case bundle(resource: String, extension: String?)
  case bytes(data: Data)

  static func fromURL(_ url: URL) -> DataSource {
    return url.isFileURL ? .file(url: url) : .http(url: url)
  }

  static func fromURL(string: String) throws -> DataSource {
    guard let url = URL(string: string) else {
      throw DataLoaderError.invalidURL(string)
    }
    return fromURL(url)
  }

  static func bundle(nameWithExtension: String) -> DataSource {
    let name = (nameWithExtension as NSString).deletingPathExtension
    let ext = (nameWithExtension as NSString).pathExtension
    return .bundle(resource: name, extension: ext.isEmpty ? nil : ext)
  }

  static func bytes(from buffer: ArrayBufferHolder) -> DataSource {
    return .bytes(data: buffer.toData(copyIfNeeded: false))
  }

  func createLoader() -> DataLoader {
    switch self {
    case .http:
      return HTTPDataLoader.shared
    case .file:
      return FileDataLoader()
    case .bundle:
      return BundleDataLoader()
    case .bytes:
      return BytesDataLoader()
    }
  }
}
