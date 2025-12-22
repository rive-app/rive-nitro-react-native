package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.BindableArtboard
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridBindableArtboard(val bindableArtboard: BindableArtboard) : HybridBindableArtboardSpec() {
  override val artboardName: String
    get() = bindableArtboard.name

  protected fun finalize() {
    bindableArtboard.release()
  }
}
