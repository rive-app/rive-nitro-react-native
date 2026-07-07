package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.Artboard
import app.rive.RiveFile
import app.rive.ViewModelSource
import app.rive.core.CommandQueue
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import java.lang.ref.WeakReference
import kotlinx.coroutines.runBlocking

@Keep
@DoNotStrip
class HybridRiveFile(
  internal var riveFile: RiveFile?,
  internal val riveWorker: CommandQueue
) : HybridRiveFileSpec() {
  companion object {
    private const val TAG = "HybridRiveFile"
  }

  private val weakViews = mutableListOf<WeakReference<HybridRiveView>>()

  // Deprecated: Use getViewModelNamesAsync instead
  override val viewModelCount: Double?
    get() {
      DeprecationWarning.warn("viewModelCount", "getViewModelNamesAsync")
      val file = riveFile ?: return null
      return try {
        runBlocking { file.getViewModelNames() }.size.toDouble()
      } catch (e: Exception) {
        RiveLog.e(TAG, "viewModelCount failed: ${e.message}")
        null
      }
    }

  override fun getViewModelNamesAsync(): Promise<Array<String>> {
    val file = riveFile ?: return Promise.resolved(emptyArray())
    return Promise.async {
      file.getViewModelNames().toTypedArray()
    }
  }

  // Deprecated: Use getViewModelNamesAsync + viewModelByNameAsync instead
  override fun viewModelByIndex(index: Double): HybridViewModelSpec? {
    DeprecationWarning.warn("viewModelByIndex", "getViewModelNamesAsync + viewModelByNameAsync")
    val file = riveFile ?: return null
    return try {
      val names = runBlocking { file.getViewModelNames() }
      val idx = index.toInt()
      if (idx < 0 || idx >= names.size) return null
      HybridViewModel(file, riveWorker, names[idx], this, ViewModelSource.Named(names[idx]))
    } catch (e: Exception) {
      RiveLog.e(TAG, "viewModelByIndex($index) failed: ${e.message}")
      null
    }
  }

  private suspend fun viewModelByNameImpl(name: String, validate: Boolean): HybridViewModelSpec? {
    val file = riveFile ?: return null
    if (validate) {
      val names = file.getViewModelNames()
      if (!names.contains(name)) return null
    }
    return HybridViewModel(file, riveWorker, name, this, ViewModelSource.Named(name))
  }

  // Deprecated: Use viewModelByNameAsync instead
  override fun viewModelByName(name: String): HybridViewModelSpec? {
    DeprecationWarning.warn("viewModelByName", "viewModelByNameAsync")
    return try {
      runBlocking { viewModelByNameImpl(name, validate = true) }
    } catch (e: Exception) {
      RiveLog.e(TAG, "viewModelByName('$name') failed: ${e.message}")
      null
    }
  }

  override fun viewModelByNameAsync(name: String, validate: Boolean?): Promise<HybridViewModelSpec?> {
    val shouldValidate = validate ?: true
    return Promise.async { viewModelByNameImpl(name, validate = shouldValidate) }
  }

  private suspend fun defaultArtboardViewModelImpl(artboardBy: ArtboardBy?): HybridViewModelSpec? {
    val file = riveFile ?: return null
    val artboardName = when (artboardBy?.type) {
      ArtboardByTypes.INDEX -> {
        val artboardNames = file.getArtboardNames()
        artboardNames.getOrNull(artboardBy.index!!.toInt())
      }
      ArtboardByTypes.NAME -> artboardBy.name
      null -> null
    }

    val artboard = if (artboardName != null) {
      Artboard.fromFile(file, artboardName)
    } else {
      Artboard.fromFile(file)
    }
    val vmSource = ViewModelSource.DefaultForArtboard(artboard)
    val vmInfo = try {
      file.getDefaultViewModelInfo(artboard)
    } catch (e: Exception) {
      runCatching { artboard.close() }
      throw e
    }
    return HybridViewModel(file, riveWorker, vmInfo.viewModelName, this, vmSource, ownedArtboard = artboard)
  }

  // Deprecated: Use defaultArtboardViewModelAsync instead
  override fun defaultArtboardViewModel(artboardBy: ArtboardBy?): HybridViewModelSpec? {
    DeprecationWarning.warn("defaultArtboardViewModel", "defaultArtboardViewModelAsync")
    return try {
      runBlocking { defaultArtboardViewModelImpl(artboardBy) }
    } catch (e: Exception) {
      RiveLog.e(TAG, "defaultArtboardViewModel failed: ${e.message}")
      null
    }
  }

  override fun defaultArtboardViewModelAsync(artboardBy: ArtboardBy?): Promise<HybridViewModelSpec?> {
    return Promise.async { defaultArtboardViewModelImpl(artboardBy) }
  }

  // Deprecated: Use getArtboardCountAsync instead
  override val artboardCount: Double
    get() {
      DeprecationWarning.warn("artboardCount", "getArtboardCountAsync")
      val file = riveFile ?: return 0.0
      return try {
        runBlocking { file.getArtboardNames() }.size.toDouble()
      } catch (e: Exception) {
        RiveLog.e(TAG, "artboardCount failed: ${e.message}")
        0.0
      }
    }

  override fun getArtboardCountAsync(): Promise<Double> {
    val file = riveFile ?: return Promise.resolved(0.0)
    return Promise.async {
      file.getArtboardNames().size.toDouble()
    }
  }

  // Deprecated: Use getArtboardNamesAsync instead
  override val artboardNames: Array<String>
    get() {
      DeprecationWarning.warn("artboardNames", "getArtboardNamesAsync")
      val file = riveFile ?: return emptyArray()
      return try {
        runBlocking { file.getArtboardNames() }.toTypedArray()
      } catch (e: Exception) {
        RiveLog.e(TAG, "artboardNames failed: ${e.message}")
        emptyArray()
      }
    }

  override fun getArtboardNamesAsync(): Promise<Array<String>> {
    val file = riveFile ?: return Promise.resolved(emptyArray())
    return Promise.async {
      file.getArtboardNames().toTypedArray()
    }
  }

  override fun getBindableArtboard(name: String): HybridBindableArtboardSpec {
    return HybridBindableArtboard(name, this)
  }

  override fun getEnums(): Promise<Array<RiveEnumDefinition>> {
    val file = riveFile ?: return Promise.resolved(emptyArray())
    return Promise.async {
      val enums = file.getEnums()
      enums
        .map { enum ->
        RiveEnumDefinition(
          name = enum.name,
          values = enum.values.toTypedArray()
        )
      }.toTypedArray()
    }
  }

  override fun updateReferencedAssets(referencedAssets: ReferencedAssetsType) {
    RiveLog.w(
      TAG,
      "updateReferencedAssets is not supported with the experimental backend — already-rendered artboards cannot be updated. Use the legacy backend for runtime asset swapping."
    )
  }

  fun registerView(view: HybridRiveView) {
    weakViews.add(WeakReference(view))
  }

  fun unregisterView(view: HybridRiveView) {
    weakViews.removeAll { it.get() == view }
  }

  override fun dispose() {
    weakViews.clear()
    riveFile?.close()
    riveFile = null
  }
}
