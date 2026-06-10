package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.ViewModelInstance
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridViewModelTriggerProperty(
  private val instance: ViewModelInstance,
  private val path: String
) : HybridViewModelTriggerPropertySpec(),
  BaseHybridViewModelProperty<Unit> by BaseHybridViewModelPropertyImpl() {

  override fun trigger() {
    instance.fireTrigger(path)
  }

  override fun addListener(onChanged: () -> Unit): () -> Unit {
    val remover = addListenerInternal { _ -> onChanged() }
    // Triggers use drop=0: getTriggerFlow has replay=0 and emits nothing on
    // subscription, so there is no initial value to skip.
    ensureValueListenerJob(instance.getTriggerFlow(path), 0)
    return remover
  }
}
