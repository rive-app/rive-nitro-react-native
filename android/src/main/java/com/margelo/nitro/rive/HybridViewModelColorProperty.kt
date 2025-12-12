package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelColorProperty
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridViewModelColorProperty(private val viewModelColor: ViewModelColorProperty) :
  HybridViewModelColorPropertySpec(),
  BaseHybridViewModelProperty<Int> by BaseHybridViewModelPropertyImpl() {
  override var value: Double
    get() = viewModelColor.value.toDouble()
    set(value) {
      viewModelColor.value = value.toInt()
    }

  override fun addListener(onChanged: (value: Double) -> Unit): () -> Unit {
    val remover = addListenerInternal { intValue: Int -> onChanged(intValue.toDouble()) }
    ensureValueListenerJob(viewModelColor.valueFlow)
    return remover
  }
}
