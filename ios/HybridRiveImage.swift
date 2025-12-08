import NitroModules
import RiveRuntime

class HybridRiveImage: HybridRiveImageSpec {
  let renderImage: RiveRenderImage
  private let dataSize: Int

  init(renderImage: RiveRenderImage, dataSize: Int) {
    self.renderImage = renderImage
    self.dataSize = dataSize
    super.init()
  }

  var byteSize: Double {
    Double(dataSize)
  }
}
