package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.Artboard
import app.rive.ViewModelInstance
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridViewModelArtboardProperty(
  private val instance: ViewModelInstance,
  private val path: String,
  private val riveFile: HybridRiveFile
) : HybridViewModelArtboardPropertySpec() {
  companion object {
    private const val TAG = "HybridViewModelArtboardProperty"
  }

  override fun set(artboard: HybridBindableArtboardSpec?) {
    val hybridArtboard = artboard as? HybridBindableArtboard ?: return
    val file = riveFile.riveFile ?: return
    try {
      val newArtboard = Artboard.fromFile(file, hybridArtboard.artboardName)
      instance.setArtboard(path, newArtboard)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to set artboard for path '$path'", e)
    }
  }
}
