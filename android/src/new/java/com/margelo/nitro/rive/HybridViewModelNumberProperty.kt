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
class HybridViewModelNumberProperty(
  private val instance: ViewModelInstance,
  private val path: String
) : HybridViewModelNumberPropertySpec(),
  BaseHybridViewModelProperty<Float> by BaseHybridViewModelPropertyImpl() {
  companion object {
    private const val TAG = "HybridViewModelNumberProperty"
  }

  // Deprecated: Use getValueAsync (read) or set(value) (write) instead
  override var value: Double
    get() {
      DeprecationWarning.warn("NumberProperty.value", "getValueAsync")
      return try {
        runBlocking { instance.getNumberFlow(path).first() }.toDouble()
      } catch (e: Exception) {
        RiveLog.e(TAG, "getValue failed for path '$path': ${e.message}")
        0.0
      }
    }
    set(value) {
      set(value)
    }

  override fun set(value: Double) {
    instance.setNumber(path, value.toFloat())
  }

  override fun getValueAsync(): Promise<Double> {
    return Promise.async { instance.getNumberFlow(path).first().toDouble() }
  }

  override fun addListener(onChanged: (value: Double) -> Unit): () -> Unit {
    val remover = addListenerInternal { floatValue: Float -> onChanged(floatValue.toDouble()) }
    ensureValueListenerJob(instance.getNumberFlow(path))
    return remover
  }
}
