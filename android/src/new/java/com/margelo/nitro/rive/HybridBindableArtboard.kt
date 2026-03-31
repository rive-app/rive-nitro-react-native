package com.margelo.nitro.rive

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridBindableArtboard(
  private val name: String,
  internal val file: HybridRiveFile
) : HybridBindableArtboardSpec() {

  override val artboardName: String
    get() = name
}
