package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.RiveFile
import app.rive.ViewModelInstance
import app.rive.ViewModelSource
import app.rive.core.CommandQueue
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.runBlocking

@Keep
@DoNotStrip
class HybridViewModel(
  private val riveFile: RiveFile,
  private val riveWorker: CommandQueue,
  private val viewModelName: String,
  private val parentFile: HybridRiveFile,
  private val vmSource: ViewModelSource = ViewModelSource.Named(viewModelName)
) : HybridViewModelSpec() {
  companion object {
    private const val TAG = "HybridViewModel"
  }

  override val propertyCount: Double
    get() = try {
      runBlocking { riveFile.getViewModelProperties(viewModelName) }.size.toDouble()
    } catch (e: Exception) {
      Log.e(TAG, "propertyCount failed", e)
      0.0
    }

  override val instanceCount: Double
    get() = try {
      runBlocking { riveFile.getViewModelInstanceNames(viewModelName) }.size.toDouble()
    } catch (e: Exception) {
      Log.e(TAG, "instanceCount failed", e)
      0.0
    }

  override val modelName: String
    get() = viewModelName

  // Deprecated: Use createInstanceByIndexAsync instead
  override fun createInstanceByIndex(index: Double): HybridViewModelInstanceSpec? {
    return createDefaultInstance()
  }

  override fun createInstanceByIndexAsync(index: Double): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async {
      val source = vmSource.defaultInstance()
      val vmi = ViewModelInstance.fromFile(riveFile, source)
      HybridViewModelInstance(vmi, riveWorker, parentFile, viewModelName)
    }
  }

  private suspend fun createInstanceByNameImpl(name: String): HybridViewModelInstanceSpec? {
    val instanceNames = riveFile.getViewModelInstanceNames(viewModelName)
    if (!instanceNames.contains(name)) return null
    val source = vmSource.namedInstance(name)
    val vmi = ViewModelInstance.fromFile(riveFile, source)
    return HybridViewModelInstance(vmi, riveWorker, parentFile, viewModelName, name)
  }

  // Deprecated: Use createInstanceByNameAsync instead
  override fun createInstanceByName(name: String): HybridViewModelInstanceSpec? {
    return try {
      runBlocking { createInstanceByNameImpl(name) }
    } catch (e: Exception) {
      Log.e(TAG, "createInstanceByName('$name') failed", e)
      null
    }
  }

  override fun createInstanceByNameAsync(name: String): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async { createInstanceByNameImpl(name) }
  }

  // Deprecated: Use createDefaultInstanceAsync instead
  override fun createDefaultInstance(): HybridViewModelInstanceSpec? {
    return try {
      val source = vmSource.defaultInstance()
      val vmi = ViewModelInstance.fromFile(riveFile, source)
      HybridViewModelInstance(vmi, riveWorker, parentFile, viewModelName)
    } catch (e: Exception) {
      Log.e(TAG, "createDefaultInstance failed", e)
      null
    }
  }

  override fun createDefaultInstanceAsync(): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async {
      val source = vmSource.defaultInstance()
      val vmi = ViewModelInstance.fromFile(riveFile, source)
      HybridViewModelInstance(vmi, riveWorker, parentFile, viewModelName)
    }
  }

  // Deprecated: Use createBlankInstanceAsync instead
  override fun createInstance(): HybridViewModelInstanceSpec? {
    return try {
      val source = vmSource.blankInstance()
      val vmi = ViewModelInstance.fromFile(riveFile, source)
      HybridViewModelInstance(vmi, riveWorker, parentFile, viewModelName)
    } catch (e: Exception) {
      Log.e(TAG, "createInstance (blank) failed", e)
      null
    }
  }

  override fun createBlankInstanceAsync(): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async {
      val source = vmSource.blankInstance()
      val vmi = ViewModelInstance.fromFile(riveFile, source)
      HybridViewModelInstance(vmi, riveWorker, parentFile, viewModelName)
    }
  }
}
