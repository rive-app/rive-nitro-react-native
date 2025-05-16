package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.File
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridRiveFile : HybridRiveFileSpec() {
  var riveFile: File? = null

  override val name: String
    get() = ""

  override fun release() {
    riveFile?.release()
    riveFile = null
  }

  // Not sure how well this works, or if it's guaranteed to be called! But adding it.
  protected fun finalize() {
    release()
  }
}
