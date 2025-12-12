package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelTriggerProperty
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridViewModelTriggerProperty(private val viewModelTrigger: ViewModelTriggerProperty) :
  HybridViewModelTriggerPropertySpec(),
  BaseHybridViewModelProperty<ViewModelTriggerProperty.TriggerUnit> by BaseHybridViewModelPropertyImpl() {
  override fun trigger() {
    viewModelTrigger.trigger()
  }

  override fun addListener(onChanged: () -> Unit): () -> Unit {
    val remover = addListenerInternal { _ -> onChanged() }
    // We drop the first value as a trigger has no initial value
    ensureValueListenerJob(viewModelTrigger.valueFlow, 1)
    return remover
  }
}
