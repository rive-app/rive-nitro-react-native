package com.margelo.nitro.rive

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow

@Keep
@DoNotStrip
interface BaseHybridViewModelProperty<T> {
    val scope: CoroutineScope?
    val job: Job?
    val listeners: MutableList<(T) -> Unit>

    fun ensureValueListenerJob(valueFlow: Flow<T>, drop: Int = 0)
    fun onChanged(value: T)
    fun removeListeners()
    fun dispose()
}
