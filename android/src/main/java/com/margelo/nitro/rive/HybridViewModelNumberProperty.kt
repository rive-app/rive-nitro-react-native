package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelNumberProperty
import com.facebook.proguard.annotations.DoNotStrip
import kotlinx.coroutines.flow.map

@Keep
@DoNotStrip
class HybridViewModelNumberProperty(private val viewModelNumber: ViewModelNumberProperty) :
  HybridViewModelNumberPropertySpec(),
  BaseHybridViewModelProperty<Double> by BaseHybridViewModelPropertyImpl() {
  override var value: Double
    get() = viewModelNumber.value.toDouble()
    set(value) {
      viewModelNumber.value = value.toFloat()
    }

  override fun addListener(onChanged: (value: Double) -> Unit) {
    listeners.add(onChanged)
    ensureValueListenerJob(viewModelNumber.valueFlow.map { it.toDouble() })
  }
}
