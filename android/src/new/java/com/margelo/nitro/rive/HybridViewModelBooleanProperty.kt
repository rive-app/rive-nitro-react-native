package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.RiveViewModelInstanceException
import app.rive.ViewModelInstance
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.runBlocking

@Keep
@DoNotStrip
class HybridViewModelBooleanProperty(
  private val instance: ViewModelInstance,
  private val path: String,
  private val hasProperty: suspend (String) -> Boolean? = { null }
) : HybridViewModelBooleanPropertySpec(),
  BaseHybridViewModelProperty<Boolean> by BaseHybridViewModelPropertyImpl() {
  companion object {
    private const val TAG = "HybridViewModelBooleanProperty"
  }

  private suspend fun requireProperty() {
    if (hasProperty(path) == false) {
      throw RiveViewModelInstanceException("Boolean property not found at path '$path'")
    }
  }

  // Deprecated: Use getValueAsync (read) or set(value) (write) instead
  override var value: Boolean
    get() {
      DeprecationWarning.warn("BooleanProperty.value", "getValueAsync")
      return try {
        runBlocking {
          requireProperty()
          instance.getBooleanFlow(path).first()
        }
      } catch (e: Exception) {
        RiveLog.e(TAG, "getValue failed for path '$path': ${e.message}")
        false
      }
    }
    set(value) {
      set(value)
    }

  override fun set(value: Boolean) {
    instance.setBoolean(path, value)
  }

  override fun setValueAsync(value: Boolean): Promise<Unit> {
    return Promise.async { set(value) }
  }

  override fun getValueAsync(): Promise<Boolean> {
    return Promise.async {
      requireProperty()
      instance.getBooleanFlow(path).first()
    }
  }

  override fun addListener(onChanged: (value: Boolean) -> Unit): () -> Unit {
    val remover = addListenerInternal(onChanged)
    ensureValueListenerJob(
      flow {
        if (hasProperty(path) == false) {
          RiveLog.e(TAG, "addListener: boolean property not found at path '$path'")
          return@flow
        }
        emitAll(instance.getBooleanFlow(path))
      }
    )
    return remover
  }
}
