package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelStringProperty
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridViewModelStringProperty(private val viewModelString: ViewModelStringProperty) :
  HybridViewModelStringPropertySpec(),
  BaseHybridViewModelProperty<String> by BaseHybridViewModelPropertyImpl() {
  override var value: String
    get() = viewModelString.value
    set(value) {
      viewModelString.value = value
    }

  override fun addListener(onChanged: (value: String) -> Unit) {
    listeners.add(onChanged)
    ensureValueListenerJob(viewModelString.valueFlow)
  }
}
