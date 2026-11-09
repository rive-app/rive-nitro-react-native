package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.ViewModelInstance
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.UiThreadUtil

@Keep
@DoNotStrip
class HybridViewModelTriggerProperty(
  private val instance: ViewModelInstance,
  private val path: String
) : HybridViewModelTriggerPropertySpec(),
  BaseHybridViewModelProperty<Unit> by BaseHybridViewModelPropertyImpl() {

  // The view calls its ref before configure() creates the state machine on the UI thread, and the
  // runtime ignores fires older than a machine, so a fire from JS queues behind that work.
  override fun trigger() {
    UiThreadUtil.runOnUiThread { instance.fireTrigger(path) }
  }

  override fun addListener(onChanged: () -> Unit): () -> Unit {
    val remover = addListenerInternal { _ -> onChanged() }
    // drop=0: getTriggerFlow (replay=0) emits nothing on subscription, unlike number/boolean flows.
    ensureValueListenerJob(instance.getTriggerFlow(path), 0)
    return remover
  }
}
