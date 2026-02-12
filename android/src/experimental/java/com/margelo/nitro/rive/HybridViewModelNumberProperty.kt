package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.ViewModelInstance
import com.facebook.proguard.annotations.DoNotStrip
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

  override var value: Double
    get() {
      return try {
        runBlocking { instance.getNumberFlow(path).first() }.toDouble()
      } catch (e: Exception) {
        Log.e(TAG, "getValue failed for path '$path'", e)
        0.0
      }
    }
    set(value) {
      instance.setNumber(path, value.toFloat())
    }

  override fun addListener(onChanged: (value: Double) -> Unit): () -> Unit {
    val remover = addListenerInternal { floatValue: Float -> onChanged(floatValue.toDouble()) }
    ensureValueListenerJob(instance.getNumberFlow(path))
    return remover
  }
}
