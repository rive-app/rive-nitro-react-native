package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.RiveViewModelInstanceException
import app.rive.ViewModelInstance
import app.rive.ViewModelInstanceSource
import app.rive.runtime.kotlin.core.ViewModel
import app.rive.core.CommandQueue
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import java.util.concurrent.ConcurrentHashMap

@Keep
@DoNotStrip
class HybridViewModelInstance(
  internal val viewModelInstance: ViewModelInstance,
  private val riveWorker: CommandQueue,
  private val parentFile: HybridRiveFile,
  private val viewModelName: String? = null,
  private val _instanceName: String? = null,
  // False for wrappers that alias an instance owned elsewhere (e.g. the
  // view's bound instance returned by RiveView.getViewModelInstance()).
  private val ownsInstance: Boolean = true
) : HybridViewModelInstanceSpec() {
  companion object {
    private const val TAG = "HybridViewModelInstance"
  }

  override fun dispose() {
    if (ownsInstance) {
      runCatching { viewModelInstance.close() }
    }
    super.dispose()
  }

  // TODO: Workaround — rive-android experimental SDK doesn't expose ViewModelInstance.name.
  // Only works when caller knows the name (createInstanceByName). Falls back to "" otherwise.
  override val instanceName: String
    get() = _instanceName ?: ""

  override fun getPropertiesAsync(): Promise<Array<ViewModelPropertyInfo>> {
    // "No metadata" must not read as "no properties" — instances obtained
    // via nested paths, list items, or the view don't carry their ViewModel
    // name on this backend.
    val name = viewModelName ?: return Promise.rejected(
      RuntimeException(
        "getPropertiesAsync is unavailable for this instance: its ViewModel " +
          "metadata is unknown (nested/list/view-obtained instances). Query the " +
          "ViewModel it was created from instead."
      )
    )
    val file = parentFile.riveFile
      ?: return Promise.rejected(RuntimeException("The RiveFile backing this instance was disposed"))
    return Promise.async {
      file
        .getViewModelProperties(name)
        .map { prop ->
        ViewModelPropertyInfo(name = prop.name, type = mapPropertyType(prop.type))
      }.toTypedArray()
    }
  }

  override fun numberProperty(path: String) =
    HybridViewModelNumberProperty(viewModelInstance, path)

  override fun stringProperty(path: String) =
    HybridViewModelStringProperty(viewModelInstance, path)

  override fun booleanProperty(path: String) =
    HybridViewModelBooleanProperty(viewModelInstance, path, ::hasBooleanProperty)

  private val booleanPathCache = ConcurrentHashMap<String, Boolean>()

  // rive-android 11.10+ answers a boolean read of an unknown path with an
  // uninitialized byte as the jboolean, which CheckJNI turns into a process
  // abort in debuggable builds (rive-app/rive-android#470). Resolve the path
  // against ViewModel metadata first; null means the lookup itself failed and
  // the read proceeds unguarded.
  internal suspend fun hasBooleanProperty(path: String): Boolean? {
    booleanPathCache[path]?.let { return it }
    val file = parentFile.riveFile ?: return null
    val parentPath = path.substringBeforeLast('/', "")
    val leaf = path.substringAfterLast('/')
    val result = try {
      val vmName = if (parentPath.isEmpty()) {
        viewModelName ?: viewModelInstance.getViewModelName()
      } else {
        val parent = try {
          ViewModelInstance.create(file, ViewModelInstanceSource.Reference(viewModelInstance, parentPath))
        } catch (e: RiveViewModelInstanceException) {
          return false.also { booleanPathCache[path] = it }
        }
        try {
          parent.getViewModelName()
        } finally {
          parent.close()
        }
      }
      file.getViewModelProperties(vmName).any {
        it.name == leaf && it.type == ViewModel.PropertyDataType.BOOLEAN
      }
    } catch (e: Exception) {
      RiveLog.w(TAG, "Could not resolve boolean property '$path': ${e.message}")
      return null
    }
    booleanPathCache[path] = result
    return result
  }

  override fun colorProperty(path: String) =
    HybridViewModelColorProperty(viewModelInstance, path)

  override fun enumProperty(path: String) =
    HybridViewModelEnumProperty(viewModelInstance, path)

  override fun triggerProperty(path: String) =
    HybridViewModelTriggerProperty(viewModelInstance, path)

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

  private fun viewModelImpl(path: String): HybridViewModelInstanceSpec? {
    val file = parentFile.riveFile ?: return null
    val source = ViewModelInstanceSource.Reference(viewModelInstance, path)
    val childVmi = ViewModelInstance.fromFile(file, source)
    return HybridViewModelInstance(childVmi, riveWorker, parentFile)
  }

  // Deprecated: Use viewModelAsync instead
  override fun viewModel(path: String): HybridViewModelInstanceSpec? {
    DeprecationWarning.warn("viewModel", "viewModelAsync")
    return try {
      viewModelImpl(path)
    } catch (e: Exception) {
      RiveLog.e(TAG, "viewModel failed for path '$path': ${e.message}")
      null
    }
  }

  override fun viewModelAsync(path: String): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async { viewModelImpl(path) }
  }

  override fun replaceViewModel(path: String, instance: HybridViewModelInstanceSpec) {
    Log.w(TAG, "replaceViewModel not yet supported in experimental API")
  }
}
