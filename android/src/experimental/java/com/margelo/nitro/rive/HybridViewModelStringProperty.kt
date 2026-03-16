package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.ViewModelInstance
import com.facebook.proguard.annotations.DoNotStrip
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

@Keep
@DoNotStrip
class HybridViewModelStringProperty(
  private val instance: ViewModelInstance,
  private val path: String
) : HybridViewModelStringPropertySpec(),
  BaseHybridViewModelProperty<String> by BaseHybridViewModelPropertyImpl() {
  companion object {
    private const val TAG = "HybridViewModelStringProperty"
  }

  // Deprecated: Use getValueAsync instead (for reading)
  override var value: String
    get() {
      return try {
        runBlocking { instance.getStringFlow(path).first() }
      } catch (e: Exception) {
        Log.e(TAG, "getValue failed for path '$path'", e)
        ""
      }
    }
    set(value) {
      instance.setString(path, value)
    }

  override fun getValueAsync(): Promise<String> {
    return Promise.async { instance.getStringFlow(path).first() }
  }

  override fun addListener(onChanged: (value: String) -> Unit): () -> Unit {
    val remover = addListenerInternal(onChanged)
    ensureValueListenerJob(instance.getStringFlow(path))
    return remover
  }
}
