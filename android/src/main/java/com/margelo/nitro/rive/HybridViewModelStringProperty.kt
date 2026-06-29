package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelStringProperty
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise

@Keep
@DoNotStrip
class HybridViewModelStringProperty(private val viewModelString: ViewModelStringProperty) :
  HybridViewModelStringPropertySpec(),
  BaseHybridViewModelProperty<String> by BaseHybridViewModelPropertyImpl() {
  override fun dispose() {
    removeListeners()
    super<HybridViewModelStringPropertySpec>.dispose()
  }

  override val memorySize: Long
    get() = VIEW_MODEL_HYBRID_MEMORY_SIZE

  override var value: String
    get() = viewModelString.value
    set(value) {
      viewModelString.value = value
    }

  override fun getValueAsync(): Promise<String> {
    return Promise.async { value }
  }

  override fun set(value: String) {
    viewModelString.value = value
  }

  override fun addListener(onChanged: (value: String) -> Unit): () -> Unit {
    val remover = addListenerInternal(onChanged)
    ensureValueListenerJob(viewModelString.valueFlow)
    return remover
  }
}
