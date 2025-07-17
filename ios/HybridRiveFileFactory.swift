import NitroModules
import RiveRuntime

class HybridRiveFileFactory: HybridRiveFileFactorySpec {
  // MARK: Public Methods
  func fromURL(url: String, loadCdn: Bool) throws -> Promise<(any HybridRiveFileSpec)> {
    // TODO: should we make use of the underlying Rive iOS URL asset loading instead
    return Promise.async {
      do {
        guard let url = URL(string: url) else {
          throw RuntimeError.error(withMessage: "Invalid URL: \(url)")
        }

        let (riveData, _) = try await URLSession.shared.get(url)
        let riveFile = try RiveFile(data: riveData, loadCdn: true)        
        let hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = riveFile
        return hybridRiveFile
      } catch let error as NSError {
        throw RuntimeError.error(withMessage: "Failed to download Rive file: \(error.localizedDescription)")
      } catch {
        throw RuntimeError.error(withMessage: "Unknown error occurred while downloading Rive file")
      }
    }
  }
  
  func fromResource(resource: String, loadCdn: Bool) throws -> Promise<(any HybridRiveFileSpec)> {
    guard let _ = Bundle.main.path(forResource: resource, ofType: "riv") else {
      throw RuntimeError.error(withMessage: "Could not find Rive file: \(resource).riv")
    }
    
    return Promise.async {
      do {
        let riveFile = try await withCheckedThrowingContinuation { continuation in
          DispatchQueue.global(qos: .userInitiated).async {
            do {
              let riveFile = try RiveFile(resource: resource, loadCdn: loadCdn)
              DispatchQueue.main.async {
                continuation.resume(returning: riveFile)
              }
            } catch {
              DispatchQueue.main.async {
                continuation.resume(throwing: error)
              }
            }
          }
        }
        
        let hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = riveFile
        return hybridRiveFile
      } catch let error as NSError {
        throw RuntimeError.error(withMessage: "Failed to load Rive file: \(error.localizedDescription)")
      } catch {
        throw RuntimeError.error(withMessage: "Unknown error occurred while loading Rive file")
      }
    }
  }
  
  func fromBytes(bytes: ArrayBufferHolder, loadCdn: Bool) throws -> Promise<(any HybridRiveFileSpec)> {
    let data = bytes.toData(copyIfNeeded: false)
    return Promise.async {
      do {
        let riveFile = try await withCheckedThrowingContinuation { continuation in
          DispatchQueue.global(qos: .userInitiated).async {
            do {
              let riveFile = try RiveFile(data: data, loadCdn: loadCdn)
              DispatchQueue.main.async {
                continuation.resume(returning: riveFile)
              }
            } catch {
              DispatchQueue.main.async {
                continuation.resume(throwing: error)
              }
            }
          }
        }
        
        let hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = riveFile
        return hybridRiveFile
      } catch let error as NSError {
        throw RuntimeError.error(withMessage: "Failed to load Rive file from bytes: \(error.localizedDescription)")
      } catch {
        throw RuntimeError.error(withMessage: "Unknown error occurred while loading Rive file from bytes")
      }
    }
  }
}
