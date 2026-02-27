package com.margelo.nitro.rive

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridFallbackFont(
  val fontBytes: ByteArray
) : HybridFallbackFontSpec()
