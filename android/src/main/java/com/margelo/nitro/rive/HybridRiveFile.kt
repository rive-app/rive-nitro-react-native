package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.File
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import java.lang.ref.WeakReference
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

@Keep
@DoNotStrip
class HybridRiveFile : HybridRiveFileSpec() {
  var riveFile: File? = null
  var referencedAssetCache: ReferencedAssetCache? = null
  var assetLoader: ReferencedAssetLoader? = null
  private val weakViews = mutableListOf<WeakReference<HybridRiveView>>()
  private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

  override val viewModelCount: Double?
    get() = riveFile?.viewModelCount?.toDouble()

  override fun viewModelByIndex(index: Double): HybridViewModelSpec? {
    val vm = riveFile?.getViewModelByIndex(index.toInt()) ?: return null
    return HybridViewModel(vm)
  }

  override fun viewModelByName(name: String): HybridViewModelSpec? {
    val vm = riveFile?.getViewModelByName(name) ?: return null
    return HybridViewModel(vm)
  }

  override fun defaultArtboardViewModel(artboardBy: ArtboardBy?): HybridViewModelSpec? {
    try {
      val artboard = when (artboardBy?.type) {
        ArtboardByTypes.INDEX -> riveFile?.artboard(artboardBy.index!!.toInt())
        ArtboardByTypes.NAME -> riveFile?.artboard(artboardBy.name!!)
        null -> riveFile?.firstArtboard
      } ?: return null

      val vm = riveFile?.defaultViewModelForArtboard(artboard) ?: return null
      return HybridViewModel(vm)
    } catch (e: Exception) {
      return null
    }
  }

  override val artboardCount: Double
    get() = riveFile?.artboardNames?.size?.toDouble() ?: 0.0

  override val artboardNames: Array<String>
    get() = riveFile?.artboardNames?.toTypedArray() ?: emptyArray()

  override fun getBindableArtboard(name: String): HybridBindableArtboardSpec {
    val file = riveFile ?: throw IllegalStateException("RiveFile not loaded")
    val bindable = file.createBindableArtboardByName(name)
    return HybridBindableArtboard(bindable)
  }

  fun registerView(view: HybridRiveView) {
    weakViews.add(WeakReference(view))
  }

  fun unregisterView(view: HybridRiveView) {
    weakViews.removeAll { it.get() == view }
  }

  private fun refreshAfterAssetChange() {
    weakViews.removeAll { it.get() == null }

    for (weakView in weakViews) {
      weakView.get()?.refreshAfterAssetChange()
    }
  }

  override fun updateReferencedAssets(referencedAssets: ReferencedAssetsType) {
    val assetsData = referencedAssets.data ?: return
    val cache = referencedAssetCache ?: return
    val loader = assetLoader ?: return

    val loadJobs = mutableListOf<kotlinx.coroutines.Deferred<Unit>>()

    for ((key, assetData) in assetsData) {
      val asset = cache[key] ?: continue
      loadJobs.add(loader.updateAsset(assetData, asset))
    }

    if (loadJobs.isNotEmpty()) {
      scope.launch {
        loadJobs.awaitAll()
        refreshAfterAssetChange()
      }
    }
  }

  override fun getEnums(): Promise<Array<RiveEnumDefinition>> {
    return Promise.async {
      val file = riveFile ?: return@async emptyArray()
      try {
        file.enums.map { enum ->
          RiveEnumDefinition(
            name = enum.name,
            values = enum.values.toTypedArray()
          )
        }.toTypedArray()
      } catch (e: NoSuchMethodError) {
        throw UnsupportedOperationException("getEnums requires rive-android SDK with enums support")
      }
    }
  }

  override fun dispose() {
    scope.cancel()
    weakViews.clear()
    assetLoader?.dispose()
    assetLoader = null
    riveFile?.release()
    riveFile = null
    referencedAssetCache?.clear()
    referencedAssetCache = null
  }
}
