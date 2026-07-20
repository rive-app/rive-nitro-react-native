package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelArtboardProperty
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridViewModelArtboardProperty(private val property: ViewModelArtboardProperty) :
  HybridViewModelArtboardPropertySpec() {

  override val memorySize: Long
    get() = VIEW_MODEL_HYBRID_MEMORY_SIZE

  override fun set(artboard: HybridBindableArtboardSpec?) {
    val bindable = (artboard as? HybridBindableArtboard)?.bindableArtboard
    property.set(bindable)
  }
}
