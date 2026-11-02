package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelImageProperty
import com.facebook.proguard.annotations.DoNotStrip
import kotlinx.coroutines.flow.map

@Keep
@DoNotStrip
class HybridViewModelImageProperty(private val viewModelImage: ViewModelImageProperty) :
  HybridViewModelImagePropertySpec(),
  BaseHybridViewModelProperty<Unit> by BaseHybridViewModelPropertyImpl() {
  override fun dispose() {
    removeListeners()
    super<HybridViewModelImagePropertySpec>.dispose()
  }

  override val memorySize: Long
    get() = VIEW_MODEL_HYBRID_MEMORY_SIZE

  override fun set(image: HybridRiveImageSpec?) {
    val img = image as? HybridRiveImage
    if (img == null) {
      viewModelImage.set(null)
      return
    }
    img.withRenderImage { viewModelImage.set(it) }
      ?: throw IllegalStateException("RiveImage has been disposed")
  }

  override fun addListener(onChanged: () -> Unit): () -> Unit {
    val remover = addListenerInternal { _ -> onChanged() }
    ensureValueListenerJob(viewModelImage.valueFlow.map { })
    return remover
  }
}
