package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.Artboard
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise

@Keep
@DoNotStrip
class HybridViewModelArtboardProperty(
  private val owner: HybridViewModelInstance,
  private val path: String,
  private val riveFile: HybridRiveFile
) : HybridViewModelArtboardPropertySpec() {
  private val instance get() = owner.viewModelInstance

  override fun set(artboard: HybridBindableArtboardSpec?): Promise<Unit> = writeProperty {
    val hybridArtboard = artboard as? HybridBindableArtboard ?: return@writeProperty
    val sourceFile = hybridArtboard.file.riveFile ?: return@writeProperty
    instance.setArtboard(path, Artboard.fromFile(sourceFile, hybridArtboard.artboardName))
  }
}
