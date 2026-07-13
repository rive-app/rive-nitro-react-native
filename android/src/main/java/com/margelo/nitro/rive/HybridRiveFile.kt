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
    if (index < 0) return null
    return try {
      val vm = riveFile?.getViewModelByIndex(index.toInt()) ?: return null
      HybridViewModel(vm)
    } catch (e: Exception) {
      null
    }
  }

  override fun viewModelByName(name: String): HybridViewModelSpec? {
    return try {
      val vm = riveFile?.getViewModelByName(name) ?: return null
      HybridViewModel(vm)
    } catch (e: Exception) {
      null
    }
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

  // The *Async lookups run on the main thread (via [riveMainScope], not Nitro's
  // Dispatchers.Default pool): they walk the same RiveFile the attached views
  // render on the main thread, and the legacy runtime has no internal
  // synchronization — off-main access is the race class of issue #297.
  // "Async" here means "doesn't block the JS thread".
  override fun getViewModelNamesAsync(): Promise<Array<String>> {
    return Promise.async(riveMainScope) {
      val file = riveFile ?: return@async emptyArray()
      val count = file.viewModelCount
      val names = mutableListOf<String>()
      for (i in 0 until count) {
        try {
          val vm = file.getViewModelByIndex(i)
          names.add(vm.name)
        } catch (_: Exception) {
        }
      }
      names.toTypedArray()
    }
  }

  override fun viewModelByNameAsync(name: String, validate: Boolean?): Promise<HybridViewModelSpec?> {
    return Promise.async(riveMainScope) { viewModelByName(name) }
  }

  override fun defaultArtboardViewModelAsync(artboardBy: ArtboardBy?): Promise<HybridViewModelSpec?> {
    return Promise.async(riveMainScope) { defaultArtboardViewModel(artboardBy) }
  }

  override fun getArtboardCountAsync(): Promise<Double> {
    return Promise.async(riveMainScope) { artboardCount }
  }

  override fun getArtboardNamesAsync(): Promise<Array<String>> {
    return Promise.async(riveMainScope) { artboardNames }
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
