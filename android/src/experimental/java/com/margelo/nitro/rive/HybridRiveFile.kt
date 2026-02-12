package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.Artboard
import app.rive.RiveFile
import app.rive.ViewModelSource
import app.rive.core.CommandQueue
import com.facebook.proguard.annotations.DoNotStrip
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

  override val viewModelCount: Double?
    get() {
      val file = riveFile ?: return null
      return try {
        runBlocking { file.getViewModelNames() }.size.toDouble()
      } catch (e: Exception) {
        Log.e(TAG, "viewModelCount failed", e)
        null
      }
    }

  override fun viewModelByIndex(index: Double): HybridViewModelSpec? {
    val file = riveFile ?: return null
    return try {
      val names = runBlocking { file.getViewModelNames() }
      val idx = index.toInt()
      if (idx < 0 || idx >= names.size) return null
      HybridViewModel(file, riveWorker, names[idx], this)
    } catch (e: Exception) {
      Log.e(TAG, "viewModelByIndex($index) failed", e)
      null
    }
  }

  override fun viewModelByName(name: String): HybridViewModelSpec? {
    val file = riveFile ?: return null
    return try {
      val names = runBlocking { file.getViewModelNames() }
      if (!names.contains(name)) return null
      HybridViewModel(file, riveWorker, name, this)
    } catch (e: Exception) {
      Log.e(TAG, "viewModelByName('$name') failed", e)
      null
    }
  }

  override fun defaultArtboardViewModel(artboardBy: ArtboardBy?): HybridViewModelSpec? {
    val file = riveFile ?: return null
    return try {
      val artboardNames = runBlocking { file.getArtboardNames() }
      val artboardName = when (artboardBy?.type) {
        ArtboardByTypes.INDEX -> artboardNames.getOrNull(artboardBy.index!!.toInt())
        ArtboardByTypes.NAME -> artboardBy.name
        null -> artboardNames.firstOrNull()
      } ?: return null

      val artboard = Artboard.fromFile(file, artboardName)
      val vmSource = ViewModelSource.DefaultForArtboard(artboard)
      val vmNames = runBlocking { file.getViewModelNames() }
      if (vmNames.isEmpty()) return null
      HybridViewModel(file, riveWorker, vmNames.first(), this)
    } catch (e: Exception) {
      Log.e(TAG, "defaultArtboardViewModel failed", e)
      null
    }
  }

  override val artboardCount: Double
    get() {
      val file = riveFile ?: return 0.0
      return try {
        runBlocking { file.getArtboardNames() }.size.toDouble()
      } catch (e: Exception) {
        Log.e(TAG, "artboardCount failed", e)
        0.0
      }
    }

  override val artboardNames: Array<String>
    get() {
      val file = riveFile ?: return emptyArray()
      return try {
        runBlocking { file.getArtboardNames() }.toTypedArray()
      } catch (e: Exception) {
        Log.e(TAG, "artboardNames failed", e)
        emptyArray()
      }
    }

  override fun getBindableArtboard(name: String): HybridBindableArtboardSpec {
    return HybridBindableArtboard(name, this)
  }

  override fun getEnums(): Array<RiveEnumDefinition> {
    val file = riveFile ?: return emptyArray()
    return try {
      val enums = runBlocking { file.getEnums() }
      enums.map { enum ->
        RiveEnumDefinition(
          name = enum.name,
          values = enum.values.toTypedArray()
        )
      }.toTypedArray()
    } catch (e: Exception) {
      Log.e(TAG, "getEnums failed", e)
      emptyArray()
    }
  }

  override fun updateReferencedAssets(referencedAssets: ReferencedAssetsType) {
    ExperimentalAssetLoader.updateAssets(referencedAssets, riveWorker)
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
