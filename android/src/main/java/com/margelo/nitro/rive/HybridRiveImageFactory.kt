package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.RiveRenderImage
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise

@Keep
@DoNotStrip
class HybridRiveImageFactory : HybridRiveImageFactorySpec() {
  override fun loadFromURLAsync(url: String): Promise<HybridRiveImageSpec> {
    return Promise.async {
      try {
        val imageData = HTTPLoader.downloadBytes(url)
        val renderImage = RiveRenderImage.fromEncoded(imageData)
        HybridRiveImage(renderImage, imageData.size)
      } catch (e: Exception) {
        throw Exception("Failed to load image from URL: $url - ${e.message}", e)
      }
    }
  }
}
