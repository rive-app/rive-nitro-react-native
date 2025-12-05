import Foundation

final class BundleDataLoader: DataLoader {
  func load(from source: DataSource) async throws -> Data {
    guard case .bundle(let resource, let ext) = source else {
      throw DataLoaderError.invalidSource
    }
    return try loadData(resource: resource, extension: ext)
  }

  func loadData(resource: String, extension ext: String?) throws -> Data {
    guard let url = Bundle.main.url(forResource: resource, withExtension: ext) else {
      let fullName = ext != nil ? "\(resource).\(ext!)" : resource
      throw DataLoaderError.resourceNotFound(resource: fullName)
    }
    return try Data(contentsOf: url)
  }

  func loadData(fileName: String) throws -> Data {
    let name = (fileName as NSString).deletingPathExtension
    let ext = (fileName as NSString).pathExtension
    let fileExtension = ext.isEmpty ? nil : ext
    return try loadData(resource: name, extension: fileExtension)
  }
}
