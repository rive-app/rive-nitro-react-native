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
  // Null when constructed via DefaultForArtboard — the Rive Android SDK does not expose
  // the ViewModel name from a ViewModelInstance, so name-dependent operations are unavailable.
  // Track: https://github.com/rive-app/rive-android/issues/XXX
  private val viewModelName: String?,
  private val parentFile: HybridRiveFile,
  private val vmSource: ViewModelSource
) : HybridViewModelSpec() {
  companion object {
    private const val TAG = "HybridViewModel"
    private const val NO_NAME_ERROR =
      "This operation requires the ViewModel name, which is unavailable for ViewModels " +
      "obtained via defaultArtboardViewModel(). The Rive Android SDK does not yet expose " +
      "the ViewModel name from a ViewModelInstance. Use a named ViewModel instead, or " +
      "track the upstream fix: https://github.com/rive-app/rive-android/issues/XXX"
  }

  override val propertyCount: Double
    get() {
      DeprecationWarning.warn("propertyCount", "getPropertyCountAsync")
      val name = viewModelName ?: throw UnsupportedOperationException(NO_NAME_ERROR)
      return try {
        runBlocking { riveFile.getViewModelProperties(name) }.size.toDouble()
      } catch (e: Exception) {
        RiveLog.e(TAG, "propertyCount failed: ${e.message}")
        0.0
      }
    }

  override val instanceCount: Double
    get() {
      DeprecationWarning.warn("instanceCount", "getInstanceCountAsync")
      val name = viewModelName ?: throw UnsupportedOperationException(NO_NAME_ERROR)
      return try {
        runBlocking { riveFile.getViewModelInstanceNames(name) }.size.toDouble()
      } catch (e: Exception) {
        RiveLog.e(TAG, "instanceCount failed: ${e.message}")
        0.0
      }
    }

  override val modelName: String
    get() = viewModelName ?: throw UnsupportedOperationException(NO_NAME_ERROR)

  override fun getPropertyCountAsync(): Promise<Double> {
    val name = viewModelName ?: return Promise.rejected(UnsupportedOperationException(NO_NAME_ERROR))
    return Promise.async { riveFile.getViewModelProperties(name).size.toDouble() }
  }

  override fun getInstanceCountAsync(): Promise<Double> {
    val name = viewModelName ?: return Promise.rejected(UnsupportedOperationException(NO_NAME_ERROR))
    return Promise.async { riveFile.getViewModelInstanceNames(name).size.toDouble() }
  }

  // Deprecated: Use createInstanceByNameAsync instead
  override fun createInstanceByIndex(index: Double): HybridViewModelInstanceSpec? {
    DeprecationWarning.warn("createInstanceByIndex", "createInstanceByNameAsync")
    val name = viewModelName ?: throw UnsupportedOperationException(NO_NAME_ERROR)
    return try {
      val idx = index.toInt()
      val instanceNames = runBlocking { riveFile.getViewModelInstanceNames(name) }
      if (idx < 0 || idx >= instanceNames.size) return null
      val instanceName = instanceNames[idx]
      runBlocking { createInstanceByNameImpl(instanceName) }
    } catch (e: UnsupportedOperationException) {
      throw e
    } catch (e: Exception) {
      RiveLog.e(TAG, "createInstanceByIndex($index) failed: ${e.message}")
      null
    }
  }

  private suspend fun createInstanceByNameImpl(instanceName: String): HybridViewModelInstanceSpec? {
    val name = viewModelName ?: throw UnsupportedOperationException(NO_NAME_ERROR)
    val instanceNames = riveFile.getViewModelInstanceNames(name)
    if (!instanceNames.contains(instanceName)) return null
    val source = vmSource.namedInstance(instanceName)
    val vmi = ViewModelInstance.fromFile(riveFile, source)
    return HybridViewModelInstance(vmi, riveWorker, parentFile, name, instanceName)
  }

  // Deprecated: Use createInstanceByNameAsync instead
  override fun createInstanceByName(name: String): HybridViewModelInstanceSpec? {
    DeprecationWarning.warn("createInstanceByName", "createInstanceByNameAsync")
    if (viewModelName == null) throw UnsupportedOperationException(NO_NAME_ERROR)
    return try {
      runBlocking { createInstanceByNameImpl(name) }
    } catch (e: UnsupportedOperationException) {
      throw e
    } catch (e: Exception) {
      RiveLog.e(TAG, "createInstanceByName('$name') failed: ${e.message}")
      null
    }
  }

  override fun createInstanceByNameAsync(name: String): Promise<HybridViewModelInstanceSpec?> {
    if (viewModelName == null) return Promise.rejected(UnsupportedOperationException(NO_NAME_ERROR))
    return Promise.async { createInstanceByNameImpl(name) }
  }

  // Deprecated: Use createDefaultInstanceAsync instead
  override fun createDefaultInstance(): HybridViewModelInstanceSpec? {
    DeprecationWarning.warn("createDefaultInstance", "createDefaultInstanceAsync")
    return try {
      val source = vmSource.defaultInstance()
      val vmi = ViewModelInstance.fromFile(riveFile, source)
      HybridViewModelInstance(vmi, riveWorker, parentFile, viewModelName)
    } catch (e: Exception) {
      RiveLog.e(TAG, "createDefaultInstance failed: ${e.message}")
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
    DeprecationWarning.warn("createInstance", "createBlankInstanceAsync")
    return try {
      val source = vmSource.blankInstance()
      val vmi = ViewModelInstance.fromFile(riveFile, source)
      HybridViewModelInstance(vmi, riveWorker, parentFile, viewModelName)
    } catch (e: Exception) {
      RiveLog.e(TAG, "createInstance (blank) failed: ${e.message}")
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
