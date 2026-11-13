package com.margelo.nitro.rive

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridRiveImage(
  rawData: ByteArray
) : HybridRiveImageSpec() {
  private val dataSize = rawData.size

  internal var rawData: ByteArray? = rawData
    private set

  override val byteSize: Double
    get() = dataSize.toDouble()

  // The encoded bytes stay on the Java heap, which Hermes can't see; without this hint it
  // collects dropped images too rarely and a decode then runs out of heap.
  override val memorySize: Long
    get() = dataSize.toLong()

  override fun dispose() {
    rawData = null
    super.dispose()
  }
}
