package com.margelo.nitro.rive
  
import com.facebook.proguard.annotations.DoNotStrip

@DoNotStrip
class Rive : HybridRiveSpec() {
  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }
}
