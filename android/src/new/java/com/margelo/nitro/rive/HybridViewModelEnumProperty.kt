package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.ViewModelInstance
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

@Keep
@DoNotStrip
class HybridViewModelEnumProperty(
  private val instance: ViewModelInstance,
  private val path: String
) : HybridViewModelEnumPropertySpec(),
  BaseHybridViewModelProperty<String> by BaseHybridViewModelPropertyImpl() {
  companion object {
    private const val TAG = "HybridViewModelEnumProperty"
  }

  // Deprecated: Use getValueAsync (read) or set(value) (write) instead
  override var value: String
    get() {
      DeprecationWarning.warn("EnumProperty.value", "getValueAsync")
      return try {
        runBlocking { instance.getEnumFlow(path).first() }
      } catch (e: Exception) {
        RiveLog.e(TAG, "getValue failed for path '$path': ${e.message}")
        ""
      }
    }
    set(value) {
      set(value)
    }

  override fun set(value: String) {
    instance.setEnum(path, value)
  }

  override fun setValueAsync(value: String): Promise<Unit> {
    return Promise.async { set(value) }
  }

  override fun getValueAsync(): Promise<String> {
    return Promise.async { instance.getEnumFlow(path).first() }
  }

  override fun addListener(onChanged: (value: String) -> Unit): () -> Unit {
    val remover = addListenerInternal(onChanged)
    ensureValueListenerJob(instance.getEnumFlow(path))
    return remover
  }
}
