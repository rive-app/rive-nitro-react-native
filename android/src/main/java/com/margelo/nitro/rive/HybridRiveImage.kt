package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.RiveRenderImage
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridRiveImage(
  val renderImage: RiveRenderImage,
  private val dataSize: Int
) : HybridRiveImageSpec() {
  override val byteSize: Double
    get() = dataSize.toDouble()
}
