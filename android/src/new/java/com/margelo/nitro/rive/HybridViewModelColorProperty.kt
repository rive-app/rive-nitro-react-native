package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.ViewModelInstance
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

@Keep
@DoNotStrip
class HybridViewModelColorProperty(
  private val instance: ViewModelInstance,
  private val path: String
) : HybridViewModelColorPropertySpec(),
  BaseHybridViewModelProperty<Int> by BaseHybridViewModelPropertyImpl() {
  companion object {
    private const val TAG = "HybridViewModelColorProperty"
  }

  // Deprecated: Use getValueAsync (read) or set(value) (write) instead
  override var value: Double
    get() {
      DeprecationWarning.warn("ColorProperty.value", "getValueAsync")
      return try {
        runBlocking { instance.getColorFlow(path).first() }.toDouble()
      } catch (e: Exception) {
        RiveLog.e(TAG, "getValue failed for path '$path': ${e.message}")
        0.0
      }
    }
    set(value) {
      set(value)
    }

  override fun set(value: Double) {
    instance.setColor(path, value.toLong().toInt())
  }

  override fun setValueAsync(value: Double): Promise<Unit> {
    return Promise.async { set(value) }
  }

  override fun getValueAsync(): Promise<Double> {
    return Promise.async { instance.getColorFlow(path).first().toDouble() }
  }

  override fun addListener(onChanged: (value: Double) -> Unit): () -> Unit {
    val remover = addListenerInternal { intValue: Int -> onChanged(intValue.toDouble()) }
    ensureValueListenerJob(instance.getColorFlow(path))
    return remover
  }
}
