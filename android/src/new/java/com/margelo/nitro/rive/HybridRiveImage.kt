package com.margelo.nitro.rive

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridRiveImage(
  internal val rawData: ByteArray
) : HybridRiveImageSpec() {

  override val byteSize: Double
    get() = rawData.size.toDouble()
}
