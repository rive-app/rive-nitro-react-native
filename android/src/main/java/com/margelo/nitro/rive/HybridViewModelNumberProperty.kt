package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelNumberProperty
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.flow.map

@Keep
@DoNotStrip
class HybridViewModelNumberProperty(private val viewModelNumber: ViewModelNumberProperty) :
  HybridViewModelNumberPropertySpec(),
  BaseHybridViewModelProperty<Double> by BaseHybridViewModelPropertyImpl() {
  override fun dispose() {
    removeListeners()
    super<HybridViewModelNumberPropertySpec>.dispose()
  }

  override val memorySize: Long
    get() = VIEW_MODEL_HYBRID_MEMORY_SIZE

  override var value: Double
    get() = viewModelNumber.value.toDouble()
    set(value) {
      viewModelNumber.value = value.toFloat()
    }

  override fun getValueAsync(): Promise<Double> {
    return Promise.async { value }
  }

  override fun set(value: Double) {
    viewModelNumber.value = value.toFloat()
  }

  override fun addListener(onChanged: (value: Double) -> Unit): () -> Unit {
    val remover = addListenerInternal(onChanged)
    ensureValueListenerJob(viewModelNumber.valueFlow.map { it.toDouble() })
    return remover
  }
}
