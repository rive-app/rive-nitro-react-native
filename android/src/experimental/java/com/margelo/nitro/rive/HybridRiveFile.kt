package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.Artboard
import app.rive.RiveFile
import app.rive.ViewModelInstance
import app.rive.ViewModelSource
import app.rive.core.CommandQueue
import app.rive.runtime.kotlin.core.ViewModel.PropertyDataType
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import java.lang.ref.WeakReference
import kotlinx.coroutines.flow.first
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

  private suspend fun viewModelByIndexImpl(index: Double): HybridViewModelSpec? {
    val file = riveFile ?: return null
    val names = file.getViewModelNames()
    val idx = index.toInt()
    if (idx < 0 || idx >= names.size) return null
    return HybridViewModel(file, riveWorker, names[idx], this)
  }

  // Deprecated: Use viewModelByIndexAsync instead
  override fun viewModelByIndex(index: Double): HybridViewModelSpec? {
    return try {
      runBlocking { viewModelByIndexImpl(index) }
    } catch (e: Exception) {
      Log.e(TAG, "viewModelByIndex($index) failed", e)
      null
    }
  }

  override fun viewModelByIndexAsync(index: Double): Promise<HybridViewModelSpec?> {
    return Promise.async { viewModelByIndexImpl(index) }
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
      val artboardName = when (artboardBy?.type) {
        ArtboardByTypes.INDEX -> {
          val artboardNames = runBlocking { file.getArtboardNames() }
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
      val resolvedName = runBlocking { resolveDefaultVMName(file, vmSource) }
      HybridViewModel(file, riveWorker, resolvedName, this, vmSource)
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

  override fun getEnums(): Promise<Array<RiveEnumDefinition>> {
    val file = riveFile ?: return Promise.resolved(emptyArray())
    return Promise.async {
      val enums = file.getEnums()
      enums.map { enum ->
        RiveEnumDefinition(
          name = enum.name,
          values = enum.values.toTypedArray()
        )
      }.toTypedArray()
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

  /**
   * Resolves the actual ViewModel name for a DefaultForArtboard source.
   * The new Rive SDK doesn't expose VM name from DefaultForArtboard directly,
   * so we compare property values between the artboard VMI and named VMIs.
   */
  private suspend fun resolveDefaultVMName(
    file: RiveFile,
    vmSource: ViewModelSource.DefaultForArtboard
  ): String {
    val vmNames = file.getViewModelNames()
    if (vmNames.size <= 1) return vmNames.firstOrNull() ?: "default"

    val artboardVmi = ViewModelInstance.fromFile(file, vmSource.defaultInstance())
    try {
      // Find a string property to use as identifier for value comparison
      val testPropName = vmNames.firstNotNullOfOrNull { name ->
        file.getViewModelProperties(name)
          .firstOrNull { it.type == PropertyDataType.STRING }
          ?.name
      } ?: return vmNames.first()

      val artboardValue = try {
        artboardVmi.getStringFlow(testPropName).first()
      } catch (_: Exception) { return vmNames.first() }

      for (name in vmNames) {
        val namedVmi = ViewModelInstance.fromFile(file, ViewModelSource.Named(name).defaultInstance())
        try {
          val namedValue = try {
            namedVmi.getStringFlow(testPropName).first()
          } catch (_: Exception) { continue }
          if (namedValue == artboardValue) return name
        } finally {
          namedVmi.close()
        }
      }
    } finally {
      artboardVmi.close()
    }

    return vmNames.firstOrNull() ?: "default"
  }

  override fun dispose() {
    weakViews.clear()
    riveFile?.close()
    riveFile = null
  }
}
