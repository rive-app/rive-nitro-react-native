package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.ViewModelInstance
import app.rive.ViewModelInstanceSource
import app.rive.core.CommandQueue
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
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
      DeprecationWarning.warn("ListProperty.length", "getLengthAsync")
      return try {
        runBlocking { instance.getListSize(path) }.toDouble()
      } catch (e: Exception) {
        RiveLog.e(TAG, "getListSize failed for path '$path': ${e.message}")
        0.0
      }
    }

  override fun getLengthAsync(): Promise<Double> {
    return Promise.async { instance.getListSize(path).toDouble() }
  }

  private suspend fun fetchInstanceAt(index: Double): HybridViewModelInstanceSpec? {
    val file = parentFile.riveFile ?: return null
    val source = ViewModelInstanceSource.ReferenceListItem(instance, path, index.toInt())
    val vmi = ViewModelInstance.fromFile(file, source)
    return HybridViewModelInstance(vmi, riveWorker, parentFile)
  }

  // Deprecated: Use getInstanceAtAsync instead
  override fun getInstanceAt(index: Double): HybridViewModelInstanceSpec? {
    DeprecationWarning.warn("ListProperty.getInstanceAt", "getInstanceAtAsync")
    return try {
      runBlocking { fetchInstanceAt(index) }
    } catch (e: Exception) {
      RiveLog.e(TAG, "getInstanceAt($index) failed for path '$path': ${e.message}")
      null
    }
  }

  override fun getInstanceAtAsync(index: Double): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async { fetchInstanceAt(index) }
  }

  override fun addInstance(instance: HybridViewModelInstanceSpec) {
    DeprecationWarning.warn("ListProperty.addInstance", "addInstanceAsync")
    val hybridInstance = instance as? HybridViewModelInstance ?: return
    this.instance.appendToList(path, hybridInstance.viewModelInstance)
  }

  override fun addInstanceAt(instance: HybridViewModelInstanceSpec, index: Double): Boolean {
    DeprecationWarning.warn("ListProperty.addInstanceAt", "addInstanceAtAsync")
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
    DeprecationWarning.warn("ListProperty.removeInstance", "removeInstanceAsync")
    val hybridInstance = instance as? HybridViewModelInstance ?: return
    this.instance.removeFromList(path, hybridInstance.viewModelInstance)
  }

  override fun removeInstanceAt(index: Double) {
    DeprecationWarning.warn("ListProperty.removeInstanceAt", "removeInstanceAtAsync")
    this.instance.removeFromListAtIndex(path, index.toInt())
  }

  override fun swap(index1: Double, index2: Double): Boolean {
    DeprecationWarning.warn("ListProperty.swap", "swapAsync")
    return try {
      this.instance.swapListItems(path, index1.toInt(), index2.toInt())
      true
    } catch (e: Exception) {
      Log.e(TAG, "swap failed", e)
      false
    }
  }

  override fun addInstanceAsync(instance: HybridViewModelInstanceSpec): Promise<Unit> {
    val hybridInstance = instance as? HybridViewModelInstance
      ?: return Promise.rejected(RuntimeException("Expected HybridViewModelInstance"))
    return Promise.async {
      this.instance.appendToList(path, hybridInstance.viewModelInstance)
    }
  }

  override fun addInstanceAtAsync(instance: HybridViewModelInstanceSpec, index: Double): Promise<Unit> {
    val hybridInstance = instance as? HybridViewModelInstance
      ?: return Promise.rejected(RuntimeException("Expected HybridViewModelInstance"))
    return Promise.async {
      this.instance.insertToListAtIndex(path, index.toInt(), hybridInstance.viewModelInstance)
    }
  }

  override fun removeInstanceAsync(instance: HybridViewModelInstanceSpec): Promise<Unit> {
    val hybridInstance = instance as? HybridViewModelInstance
      ?: return Promise.rejected(RuntimeException("Expected HybridViewModelInstance"))
    return Promise.async {
      this.instance.removeFromList(path, hybridInstance.viewModelInstance)
    }
  }

  override fun removeInstanceAtAsync(index: Double): Promise<Unit> {
    return Promise.async {
      this.instance.removeFromListAtIndex(path, index.toInt())
    }
  }

  override fun swapAsync(index1: Double, index2: Double): Promise<Unit> {
    return Promise.async {
      this.instance.swapListItems(path, index1.toInt(), index2.toInt())
    }
  }

  override fun addListener(onChanged: () -> Unit): () -> Unit {
    // List change listeners not supported in experimental API
    return {}
  }
}
