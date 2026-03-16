package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.ViewModelInstance
import app.rive.ViewModelInstanceSource
import app.rive.core.CommandQueue
import com.facebook.proguard.annotations.DoNotStrip
import kotlinx.coroutines.runBlocking

@Keep
@DoNotStrip
class HybridViewModelListProperty(
  private val instance: ViewModelInstance,
  private val path: String,
  private val riveWorker: CommandQueue,
  private val parentFile: HybridRiveFile
) : HybridViewModelListPropertySpec(),
  BaseHybridViewModelProperty<Unit> by BaseHybridViewModelPropertyImpl() {
  companion object {
    private const val TAG = "HybridViewModelListProperty"
  }

  // Deprecated: Use getLengthAsync instead
  override val length: Double
    get() {
      return try {
        runBlocking { instance.getListSize(path) }.toDouble()
      } catch (e: Exception) {
        Log.e(TAG, "getListSize failed for path '$path'", e)
        0.0
      }
    }

  override fun getLengthAsync(): Promise<Double> {
    return Promise.async { instance.getListSize(path).toDouble() }
  }

  // Deprecated: Use getInstanceAtAsync instead
  override fun getInstanceAt(index: Double): HybridViewModelInstanceSpec? {
    return try {
      val file = parentFile.riveFile ?: return null
      val source = ViewModelInstanceSource.ReferenceListItem(instance, path, index.toInt())
      val vmi = ViewModelInstance.fromFile(file, source)
      HybridViewModelInstance(vmi, riveWorker, parentFile)
    } catch (e: Exception) {
      Log.e(TAG, "getInstanceAt($index) failed for path '$path'", e)
      null
    }
  }

  override fun getInstanceAtAsync(index: Double): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async {
      val file = parentFile.riveFile ?: return@async null
      val source = ViewModelInstanceSource.ReferenceListItem(instance, path, index.toInt())
      val vmi = ViewModelInstance.fromFile(file, source)
      HybridViewModelInstance(vmi, riveWorker, parentFile)
    }
  }

  override fun addInstance(instance: HybridViewModelInstanceSpec) {
    val hybridInstance = instance as? HybridViewModelInstance ?: return
    this.instance.appendToList(path, hybridInstance.viewModelInstance)
  }

  override fun addInstanceAt(instance: HybridViewModelInstanceSpec, index: Double): Boolean {
    val hybridInstance = instance as? HybridViewModelInstance ?: return false
    return try {
      this.instance.insertToListAtIndex(path, index.toInt(), hybridInstance.viewModelInstance)
      true
    } catch (e: Exception) {
      Log.e(TAG, "addInstanceAt failed", e)
      false
    }
  }

  override fun removeInstance(instance: HybridViewModelInstanceSpec) {
    val hybridInstance = instance as? HybridViewModelInstance ?: return
    this.instance.removeFromList(path, hybridInstance.viewModelInstance)
  }

  override fun removeInstanceAt(index: Double) {
    this.instance.removeFromListAtIndex(path, index.toInt())
  }

  override fun swap(index1: Double, index2: Double): Boolean {
    return try {
      this.instance.swapListItems(path, index1.toInt(), index2.toInt())
      true
    } catch (e: Exception) {
      Log.e(TAG, "swap failed", e)
      false
    }
  }

  override fun addListener(onChanged: () -> Unit): () -> Unit {
    // List change listeners not supported in experimental API
    return {}
  }
}
