package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.ViewModelInstance
import app.rive.ViewModelInstanceSource
import app.rive.core.CommandQueue
import com.facebook.proguard.annotations.DoNotStrip
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

@Keep
@DoNotStrip
class HybridViewModelInstance(
  internal val viewModelInstance: ViewModelInstance,
  private val riveWorker: CommandQueue,
  private val parentFile: HybridRiveFile,
  private val viewModelName: String? = null,
  private val _instanceName: String? = null
) : HybridViewModelInstanceSpec() {
  companion object {
    private const val TAG = "HybridViewModelInstance"
  }

  private val propertyNames: Set<String> by lazy {
    val name = viewModelName ?: return@lazy emptySet()
    val file = parentFile.riveFile ?: return@lazy emptySet()
    try {
      runBlocking { file.getViewModelProperties(name) }.map { it.name }.toSet()
    } catch (e: Exception) {
      Log.e(TAG, "Failed to fetch property names for viewModel '$name'", e)
      emptySet()
    }
  }

  private fun hasProperty(path: String): Boolean {
    if (propertyNames.isEmpty()) return true
    return propertyNames.contains(path)
  }

  override val instanceName: String
    get() = _instanceName ?: ""

  override fun numberProperty(path: String): HybridViewModelNumberPropertySpec? {
    return try {
      runBlocking { viewModelInstance.getNumberFlow(path).first() }
      HybridViewModelNumberProperty(viewModelInstance, path)
    } catch (e: Exception) {
      Log.e(TAG, "numberProperty failed for path '$path'", e)
      null
    }
  }

  override fun stringProperty(path: String): HybridViewModelStringPropertySpec? {
    return try {
      runBlocking { viewModelInstance.getStringFlow(path).first() }
      HybridViewModelStringProperty(viewModelInstance, path)
    } catch (e: Exception) {
      Log.e(TAG, "stringProperty failed for path '$path'", e)
      null
    }
  }

  override fun booleanProperty(path: String): HybridViewModelBooleanPropertySpec? {
    return try {
      runBlocking { viewModelInstance.getBooleanFlow(path).first() }
      HybridViewModelBooleanProperty(viewModelInstance, path)
    } catch (e: Exception) {
      Log.e(TAG, "booleanProperty failed for path '$path'", e)
      null
    }
  }

  override fun colorProperty(path: String): HybridViewModelColorPropertySpec? {
    return try {
      runBlocking { viewModelInstance.getColorFlow(path).first() }
      HybridViewModelColorProperty(viewModelInstance, path)
    } catch (e: Exception) {
      Log.e(TAG, "colorProperty failed for path '$path'", e)
      null
    }
  }

  override fun enumProperty(path: String): HybridViewModelEnumPropertySpec? {
    return try {
      runBlocking { viewModelInstance.getEnumFlow(path).first() }
      HybridViewModelEnumProperty(viewModelInstance, path)
    } catch (e: Exception) {
      Log.e(TAG, "enumProperty failed for path '$path'", e)
      null
    }
  }

  override fun triggerProperty(path: String): HybridViewModelTriggerPropertySpec? {
    if (!hasProperty(path)) return null
    return try {
      HybridViewModelTriggerProperty(viewModelInstance, path)
    } catch (e: Exception) {
      Log.e(TAG, "triggerProperty failed for path '$path'", e)
      null
    }
  }

  override fun imageProperty(path: String): HybridViewModelImagePropertySpec? {
    return try {
      HybridViewModelImageProperty(viewModelInstance, path, riveWorker)
    } catch (e: Exception) {
      Log.e(TAG, "imageProperty failed for path '$path'", e)
      null
    }
  }

  override fun listProperty(path: String): HybridViewModelListPropertySpec? {
    return try {
      HybridViewModelListProperty(viewModelInstance, path, riveWorker, parentFile)
    } catch (e: Exception) {
      Log.e(TAG, "listProperty failed for path '$path'", e)
      null
    }
  }

  override fun artboardProperty(path: String): HybridViewModelArtboardPropertySpec? {
    return try {
      HybridViewModelArtboardProperty(viewModelInstance, path, parentFile)
    } catch (e: Exception) {
      Log.e(TAG, "artboardProperty failed for path '$path'", e)
      null
    }
  }

  override fun viewModel(path: String): HybridViewModelInstanceSpec? {
    if (!hasProperty(path)) return null
    return try {
      val file = parentFile.riveFile ?: return null
      val source = ViewModelInstanceSource.Reference(viewModelInstance, path)
      val childVmi = ViewModelInstance.fromFile(file, source)
      HybridViewModelInstance(childVmi, riveWorker, parentFile)
    } catch (e: Exception) {
      Log.e(TAG, "viewModel failed for path '$path'", e)
      null
    }
  }

  override fun replaceViewModel(path: String, instance: HybridViewModelInstanceSpec) {
    Log.w(TAG, "replaceViewModel not yet supported in experimental API")
  }
}
