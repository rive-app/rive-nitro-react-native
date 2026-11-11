package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelTriggerProperty
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.UiThreadUtil

@Keep
@DoNotStrip
class HybridViewModelTriggerProperty(private val viewModelTrigger: ViewModelTriggerProperty) :
  HybridViewModelTriggerPropertySpec(),
  BaseHybridViewModelProperty<ViewModelTriggerProperty.TriggerUnit> by BaseHybridViewModelPropertyImpl() {
  override fun dispose() {
    removeListeners()
    super<HybridViewModelTriggerPropertySpec>.dispose()
  }

  override val memorySize: Long
    get() = VIEW_MODEL_HYBRID_MEMORY_SIZE

  // The view calls its ref before configure() creates the state machine on the UI thread, and the
  // runtime ignores fires older than a machine, so a fire from JS queues behind that work.
  override fun trigger() {
    UiThreadUtil.runOnUiThread { viewModelTrigger.trigger() }
  }

  override fun addListener(onChanged: () -> Unit): () -> Unit {
    val remover = addListenerInternal { _ -> onChanged() }
    // We drop the first value as a trigger has no initial value
    ensureValueListenerJob(viewModelTrigger.valueFlow, 1)
    return remover
  }
}
