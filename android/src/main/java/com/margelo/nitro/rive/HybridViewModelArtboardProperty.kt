package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelArtboardProperty
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridViewModelArtboardProperty(private val property: ViewModelArtboardProperty) :
  HybridViewModelArtboardPropertySpec() {

  override fun set(artboard: HybridBindableArtboardSpec?) {
    val bindable = (artboard as? HybridBindableArtboard)?.bindableArtboard
    property.set(bindable)
  }

  // Android SDK doesn't support listeners on artboard properties
  override fun addListener(onChanged: () -> Unit): () -> Unit {
    return {}
  }

  override fun removeListeners() {
    // No-op on Android - artboard properties don't support listeners
  }
}
