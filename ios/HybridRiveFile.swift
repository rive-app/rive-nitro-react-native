import RiveRuntime

class HybridRiveFile: HybridRiveFileSpec {
  var riveFile: RiveFile?
  
  var name: String {
    return ""
  }
  
  public func setRiveFile(_ riveFile: RiveFile) {
    self.riveFile = riveFile
  }
  
  func release() throws {
    //  iOS does not need to release the Rive file.
    riveFile = nil
  }
  
  deinit {
    try? release()
  }
}
