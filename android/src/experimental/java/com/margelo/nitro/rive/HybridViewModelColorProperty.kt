package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.ViewModelInstance
import com.facebook.proguard.annotations.DoNotStrip
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

  override var value: Double
    get() {
      return try {
        runBlocking { instance.getColorFlow(path).first() }.toDouble()
      } catch (e: Exception) {
        Log.e(TAG, "getValue failed for path '$path'", e)
        0.0
      }
    }
    set(value) {
      instance.setColor(path, value.toLong().toInt())
    }

  override fun addListener(onChanged: (value: Double) -> Unit): () -> Unit {
    val remover = addListenerInternal { intValue: Int -> onChanged(intValue.toDouble()) }
    ensureValueListenerJob(instance.getColorFlow(path))
    return remover
  }
}
