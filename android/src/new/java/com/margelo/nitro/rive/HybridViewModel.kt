package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.RiveFile
import app.rive.ViewModelInstance
import app.rive.ViewModelSource
import app.rive.core.CommandQueue
import app.rive.runtime.kotlin.core.ViewModel
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.runBlocking

@Keep
@DoNotStrip
class HybridViewModel(
  private val riveFile: RiveFile,
  private val riveWorker: CommandQueue,
  private val viewModelName: String?,
  private val parentFile: HybridRiveFile,
  private val vmSource: ViewModelSource
) : HybridViewModelSpec() {
  companion object {
    private const val TAG = "HybridViewModel"
  }

  override fun getPropertiesAsync(): Promise<Array<ViewModelPropertyInfo>> {
    val name = viewModelName ?: return Promise.resolved(emptyArray())
    return Promise.async {
      riveFile
        .getViewModelProperties(name)
        .map { prop ->
        ViewModelPropertyInfo(name = prop.name, type = mapPropertyType(prop.type))
      }.toTypedArray()
    }
  }

  override val propertyCount: Double
    get() {
      DeprecationWarning.warn("propertyCount", "getPropertyCountAsync")
      val name = viewModelName ?: throw UnsupportedOperationException("ViewModel name is unavailable")
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
      val name = viewModelName ?: throw UnsupportedOperationException("ViewModel name is unavailable")
      return try {
        runBlocking { riveFile.getViewModelInstanceNames(name) }.size.toDouble()
      } catch (e: Exception) {
        RiveLog.e(TAG, "instanceCount failed: ${e.message}")
        0.0
      }
    }

  override val modelName: String
    get() = viewModelName ?: throw UnsupportedOperationException("ViewModel name is unavailable")

  override fun getPropertyCountAsync(): Promise<Double> {
    val name = viewModelName ?: return Promise.rejected(UnsupportedOperationException("ViewModel name is unavailable"))
    return Promise.async { riveFile.getViewModelProperties(name).size.toDouble() }
  }

  override fun getInstanceCountAsync(): Promise<Double> {
    val name = viewModelName ?: return Promise.rejected(UnsupportedOperationException("ViewModel name is unavailable"))
    return Promise.async { riveFile.getViewModelInstanceNames(name).size.toDouble() }
  }

  // Deprecated: Use createInstanceByNameAsync instead
  override fun createInstanceByIndex(index: Double): HybridViewModelInstanceSpec? {
    DeprecationWarning.warn("createInstanceByIndex", "createInstanceByNameAsync")
    val name = viewModelName ?: throw UnsupportedOperationException("ViewModel name is unavailable")
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
    val name = viewModelName ?: throw UnsupportedOperationException("ViewModel name is unavailable")
    val instanceNames = riveFile.getViewModelInstanceNames(name)
    if (!instanceNames.contains(instanceName)) return null
    val source = vmSource.namedInstance(instanceName)
    val vmi = ViewModelInstance.fromFile(riveFile, source)
    return HybridViewModelInstance(vmi, riveWorker, parentFile, name, instanceName)
  }

  // Deprecated: Use createInstanceByNameAsync instead
  override fun createInstanceByName(name: String): HybridViewModelInstanceSpec? {
    DeprecationWarning.warn("createInstanceByName", "createInstanceByNameAsync")
    if (viewModelName == null) throw UnsupportedOperationException("ViewModel name is unavailable")
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
    if (viewModelName == null) return Promise.rejected(UnsupportedOperationException("ViewModel name is unavailable"))
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

internal fun mapPropertyType(type: ViewModel.PropertyDataType): ViewModelPropertyType = when (type) {
  ViewModel.PropertyDataType.NONE -> ViewModelPropertyType.NONE
  ViewModel.PropertyDataType.STRING -> ViewModelPropertyType.STRING
  ViewModel.PropertyDataType.NUMBER -> ViewModelPropertyType.NUMBER
  ViewModel.PropertyDataType.BOOLEAN -> ViewModelPropertyType.BOOLEAN
  ViewModel.PropertyDataType.COLOR -> ViewModelPropertyType.COLOR
  ViewModel.PropertyDataType.LIST -> ViewModelPropertyType.LIST
  ViewModel.PropertyDataType.ENUM -> ViewModelPropertyType.ENUM
  ViewModel.PropertyDataType.TRIGGER -> ViewModelPropertyType.TRIGGER
  ViewModel.PropertyDataType.VIEW_MODEL -> ViewModelPropertyType.VIEWMODEL
  ViewModel.PropertyDataType.INTEGER -> ViewModelPropertyType.INTEGER
  ViewModel.PropertyDataType.SYMBOL_LIST_INDEX -> ViewModelPropertyType.SYMBOLLISTINDEX
  ViewModel.PropertyDataType.ASSET_IMAGE -> ViewModelPropertyType.ASSETIMAGE
  ViewModel.PropertyDataType.ARTBOARD -> ViewModelPropertyType.ARTBOARD
}
