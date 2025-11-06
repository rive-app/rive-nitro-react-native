package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.File
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridRiveFile : HybridRiveFileSpec() {
  var riveFile: File? = null
  var referencedAssetCache: ReferencedAssetCache? = null

  override val viewModelCount: Double?
    get() = riveFile?.viewModelCount?.toDouble()

  override fun viewModelByIndex(index: Double): HybridViewModelSpec? {
    val vm = riveFile?.getViewModelByIndex(index.toInt()) ?: return null;
    return HybridViewModel(vm)
  }

  override fun viewModelByName(name: String): HybridViewModelSpec? {
    val vm = riveFile?.getViewModelByName(name) ?: return null;
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

  override fun updateReferencedAssets(referencedAssets: ReferencedAssetsType) {
    // TODO: Implement dynamic asset updates
  }

  override fun release() {
    riveFile?.release()
    riveFile = null
    referencedAssetCache?.clear()
    referencedAssetCache = null
  }
}
