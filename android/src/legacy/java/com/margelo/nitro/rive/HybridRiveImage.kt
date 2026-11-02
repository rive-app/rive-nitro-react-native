package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.RiveRenderImage
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridRiveImage(
  renderImage: RiveRenderImage,
  private val dataSize: Int,
  private val decodedSize: Long
) : HybridRiveImageSpec() {
  // Consumers (view model image properties, image assets) take their own
  // native ref, so releasing ours only frees the image once nothing shows it.
  internal var renderImage: RiveRenderImage? = renderImage
    private set

  override val byteSize: Double
    get() = dataSize.toDouble()

  // The decoded pixels live outside the JS heap; without this hint Hermes
  // collects dropped images too rarely to bound native/GPU memory.
  override val memorySize: Long
    get() = decodedSize

  /** Runs [block] with the image held so a concurrent [dispose] can't release it mid-use. */
  internal fun <T> withRenderImage(block: (RiveRenderImage) -> T): T? =
    synchronized(this) { renderImage?.let(block) }

  override fun dispose() {
    synchronized(this) {
      renderImage?.release()
      renderImage = null
    }
    super.dispose()
  }

  protected fun finalize() {
    dispose()
  }
}
