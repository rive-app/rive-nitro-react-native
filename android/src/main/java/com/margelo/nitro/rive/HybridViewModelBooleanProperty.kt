package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelBooleanProperty
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise

@Keep
@DoNotStrip
class HybridViewModelBooleanProperty(private val viewModelBoolean: ViewModelBooleanProperty) :
  HybridViewModelBooleanPropertySpec(),
  BaseHybridViewModelProperty<Boolean> by BaseHybridViewModelPropertyImpl() {
  override fun dispose() {
    removeListeners()
    super<HybridViewModelBooleanPropertySpec>.dispose()
  }

  override val memorySize: Long
    get() = VIEW_MODEL_HYBRID_MEMORY_SIZE

  override var value: Boolean
    get() = viewModelBoolean.value
    set(value) {
      viewModelBoolean.value = value
    }

  override fun getValueAsync(): Promise<Boolean> {
    return Promise.async { value }
  }

  override fun set(value: Boolean) {
    viewModelBoolean.value = value
  }

  override fun addListener(onChanged: (value: Boolean) -> Unit): () -> Unit {
    val remover = addListenerInternal(onChanged)
    ensureValueListenerJob(viewModelBoolean.valueFlow)
    return remover
  }
}
