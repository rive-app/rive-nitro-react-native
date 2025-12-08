package com.margelo.nitro.rive

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.drop
import java.lang.ref.WeakReference
import java.util.UUID

@Keep
@DoNotStrip
class BaseHybridViewModelPropertyImpl<T> : BaseHybridViewModelProperty<T> {
  override var scope: CoroutineScope? = null
  override var job: Job? = null
  override val listeners = mutableMapOf<String, (T) -> Unit>()

  override fun ensureValueListenerJob(valueFlow: Flow<T>, drop: Int) {
    if (scope == null) {
      scope = CoroutineScope(Dispatchers.Default)
    }
    if (job == null) {
      job = scope?.launch {
        valueFlow.drop(drop).collect { value ->
          onChanged(value)
        }
      }
    }
  }

  override fun onChanged(value: T) {
    listeners.values.forEach { listener ->
      listener(value)
    }
  }

  override fun addListenerInternal(callback: (T) -> Unit): () -> Unit {
    val id = UUID.randomUUID().toString()
    listeners[id] = callback
    val weakSelf = WeakReference(this)
    return {
      weakSelf.get()?.removeListener(id)
    }
  }

  override fun removeListener(id: String) {
    listeners.remove(id)
    if (listeners.isEmpty()) {
      job?.cancel()
      job = null
    }
  }

  override fun removeListeners() {
    listeners.clear()
    job?.cancel()
    scope?.cancel()
    job = null
    scope = null
  }

  override fun dispose() {
    removeListeners()
  }
}
