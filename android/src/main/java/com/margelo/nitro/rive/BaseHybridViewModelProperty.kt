package com.margelo.nitro.rive

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow

// memorySize hint: these wrappers look tiny to Hermes but each pins a JNI global ref, so
// without it the GC lets them pile up until the global reference table (cap 51200) overflows.
const val VIEW_MODEL_HYBRID_MEMORY_SIZE = 65_536L

@Keep
@DoNotStrip
interface BaseHybridViewModelProperty<T> {
  val scope: CoroutineScope?
  val job: Job?
  val listeners: MutableMap<String, (T) -> Unit>

  fun ensureValueListenerJob(valueFlow: Flow<T>, drop: Int = 0)
  fun onChanged(value: T)
  fun addListenerInternal(callback: (T) -> Unit): () -> Unit
  fun removeListener(id: String)
  fun removeListeners()
  fun dispose()
}
