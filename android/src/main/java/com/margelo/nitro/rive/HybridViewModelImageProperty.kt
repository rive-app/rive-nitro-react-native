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
  override fun set(image: HybridRiveImageSpec?) {
    viewModelImage.set((image as? HybridRiveImage)?.renderImage)
  }

  override fun addListener(onChanged: () -> Unit) {
    listeners.add { _ -> onChanged() }
    ensureValueListenerJob(viewModelImage.valueFlow.map { })
  }
}
