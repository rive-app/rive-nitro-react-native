package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelEnumProperty
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridViewModelEnumProperty(private val viewModelEnum: ViewModelEnumProperty) :
  HybridViewModelEnumPropertySpec(),
  BaseHybridViewModelProperty<String> by BaseHybridViewModelPropertyImpl() {
  override var value: String
    get() = viewModelEnum.value
    set(value) {
      viewModelEnum.value = value
    }

  override fun addListener(onChanged: (value: String) -> Unit): () -> Unit {
    val remover = addListenerInternal(onChanged)
    ensureValueListenerJob(viewModelEnum.valueFlow)
    return remover
  }
}
