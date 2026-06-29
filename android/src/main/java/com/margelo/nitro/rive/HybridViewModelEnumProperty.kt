package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelEnumProperty
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise

@Keep
@DoNotStrip
class HybridViewModelEnumProperty(private val viewModelEnum: ViewModelEnumProperty) :
  HybridViewModelEnumPropertySpec(),
  BaseHybridViewModelProperty<String> by BaseHybridViewModelPropertyImpl() {
  override fun dispose() {
    removeListeners()
    super<HybridViewModelEnumPropertySpec>.dispose()
  }

  override val memorySize: Long
    get() = VIEW_MODEL_HYBRID_MEMORY_SIZE

  override var value: String
    get() = viewModelEnum.value
    set(value) {
      viewModelEnum.value = value
    }

  override fun getValueAsync(): Promise<String> {
    return Promise.async { value }
  }

  override fun set(value: String) {
    viewModelEnum.value = value
  }

  override fun addListener(onChanged: (value: String) -> Unit): () -> Unit {
    val remover = addListenerInternal(onChanged)
    ensureValueListenerJob(viewModelEnum.valueFlow)
    return remover
  }
}
