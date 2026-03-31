package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.ViewModelInstance
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

@Keep
@DoNotStrip
class HybridViewModelBooleanProperty(
  private val instance: ViewModelInstance,
  private val path: String
) : HybridViewModelBooleanPropertySpec(),
  BaseHybridViewModelProperty<Boolean> by BaseHybridViewModelPropertyImpl() {
  companion object {
    private const val TAG = "HybridViewModelBooleanProperty"
  }

  // Deprecated: Use getValueAsync (read) or set(value) (write) instead
  override var value: Boolean
    get() {
      return try {
        runBlocking { instance.getBooleanFlow(path).first() }
      } catch (e: Exception) {
        Log.e(TAG, "getValue failed for path '$path'", e)
        false
      }
    }
    set(value) {
      set(value)
    }

  override fun set(value: Boolean) {
    instance.setBoolean(path, value)
  }

  override fun getValueAsync(): Promise<Boolean> {
    return Promise.async { instance.getBooleanFlow(path).first() }
  }

  override fun addListener(onChanged: (value: Boolean) -> Unit): () -> Unit {
    val remover = addListenerInternal(onChanged)
    ensureValueListenerJob(instance.getBooleanFlow(path))
    return remover
  }
}
