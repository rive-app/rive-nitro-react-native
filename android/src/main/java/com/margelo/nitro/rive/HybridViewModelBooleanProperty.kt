package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelBooleanProperty
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridViewModelBooleanProperty(private val viewModelBoolean: ViewModelBooleanProperty) :
  HybridViewModelBooleanPropertySpec(),
  BaseHybridViewModelProperty<Boolean> by BaseHybridViewModelPropertyImpl() {
  override var value: Boolean
    get() = viewModelBoolean.value
    set(value) {
      viewModelBoolean.value = value
    }

  override fun addListener(onChanged: (value: Boolean) -> Unit) {
    listeners.add(onChanged)
    ensureValueListenerJob(viewModelBoolean.valueFlow)
  }
}
