package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.ViewModelInstance
import com.facebook.proguard.annotations.DoNotStrip
import com.rive.RiveReactNativeView

@Keep
@DoNotStrip
class HybridViewModelTriggerProperty(
  private val instance: ViewModelInstance,
  private val path: String
) : HybridViewModelTriggerPropertySpec(),
  BaseHybridViewModelProperty<Unit> by BaseHybridViewModelPropertyImpl() {

  override fun trigger() {
    instance.fireTrigger(path)
    RiveReactNativeView.onViewModelChanged()
  }

  override fun addListener(onChanged: () -> Unit): () -> Unit {
    val remover = addListenerInternal { _ -> onChanged() }
    // drop=0: getTriggerFlow (replay=0) emits nothing on subscription, unlike number/boolean flows.
    ensureValueListenerJob(CommandQueuePolling.whileCollected(instance.getTriggerFlow(path)), 0)
    return remover
  }
}
