import NitroModules
import RiveRuntime

class HybridRiveImage: HybridRiveImageSpec {
  let renderImage: RiveRenderImage
  let rawData: Data

  init(renderImage: RiveRenderImage, rawData: Data) {
    self.renderImage = renderImage
    self.rawData = rawData
    super.init()
  }

  var byteSize: Double {
    Double(rawData.count)
  }
}
