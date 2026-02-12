package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.RiveRenderImage
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise

@Keep
@DoNotStrip
class HybridRiveImageFactory : HybridRiveImageFactorySpec() {
  private fun loadFromDataSource(source: DataSource): Promise<HybridRiveImageSpec> = Promise.async {
    val imageData = source.createLoader().load(source)
    val renderImage = RiveRenderImage.fromEncoded(imageData)
    HybridRiveImage(renderImage, imageData.size)
  }

  override fun loadFromURLAsync(url: String) = loadFromDataSource(DataSource.fromURL(url))

  override fun loadFromResourceAsync(resource: String) = loadFromDataSource(DataSource.resource(resource))

  override fun loadFromBytesAsync(bytes: ArrayBuffer) = loadFromDataSource(DataSource.Bytes.from(bytes))
}
