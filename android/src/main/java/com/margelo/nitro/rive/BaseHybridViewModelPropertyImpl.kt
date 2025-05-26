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

@Keep
@DoNotStrip
class BaseHybridViewModelPropertyImpl<T> : BaseHybridViewModelProperty<T> {
    override var scope: CoroutineScope? = null
    override var job: Job? = null
    override val listeners = mutableListOf<(T) -> Unit>()

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
        listeners.forEach { listener ->
            listener(value)
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
