package com.margelo.nitro.rive

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class Rive : HybridRiveSpec() {
  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }
}
