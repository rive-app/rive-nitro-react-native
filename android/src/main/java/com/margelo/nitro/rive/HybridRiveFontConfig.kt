package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.runtime.kotlin.fonts.FontFallbackStrategy
import app.rive.runtime.kotlin.fonts.FontHelper
import app.rive.runtime.kotlin.fonts.Fonts
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Keep
@DoNotStrip
class HybridRiveFontConfig : HybridRiveFontConfigSpec() {
  companion object {
    private const val TAG = "RiveFonts"
    private const val DEFAULT_WEIGHT = 0
    private val fontsByWeight: MutableMap<Int, List<HybridFallbackFontSpec>> =
      java.util.Collections.synchronizedMap(mutableMapOf())

    private fun resetFontCache() {
      try {
        FontFallbackStrategy.cppResetFontCache()
      } catch (e: Exception) {
        Log.e(TAG, "Failed to reset font cache: ${e.message}")
      }
    }
  }

  override fun loadFontFromURL(url: String): Promise<HybridFallbackFontSpec> {
    return Promise.async {
      val fontBytes = withContext(Dispatchers.IO) {
        URL(url).readBytes()
      }
      HybridFallbackFont(fontBytes)
    }
  }

  override fun loadFontFromResource(resource: String): HybridFallbackFontSpec {
    val context = NitroModules.applicationContext
      ?: throw Error("Application context not available")

    val resName = resource.substringBeforeLast(".")

    val rawId = context.resources.getIdentifier(resName, "raw", context.packageName)
    if (rawId != 0) {
      val fontBytes = context.resources.openRawResource(rawId).use { it.readBytes() }
      return HybridFallbackFont(fontBytes)
    }

    val fontId = context.resources.getIdentifier(resName, "font", context.packageName)
    if (fontId != 0) {
      val fontBytes = context.resources.openRawResource(fontId).use { it.readBytes() }
      return HybridFallbackFont(fontBytes)
    }

    val assetPaths = listOf("fonts/$resource", resource)
    for (assetPath in assetPaths) {
      try {
        val fontBytes = context.assets.open(assetPath).use { it.readBytes() }
        return HybridFallbackFont(fontBytes)
      } catch (_: Exception) {
      }
    }

    throw Error("Font resource not found: $resource (checked res/raw, res/font, assets/fonts)")
  }

  override fun loadFontFromBytes(bytes: ArrayBuffer): HybridFallbackFontSpec {
    val buffer = bytes.getBuffer(false)
    val byteArray = ByteArray(buffer.remaining())
    buffer.get(byteArray)
    return HybridFallbackFont(byteArray)
  }

  override fun loadFontByName(name: String): HybridFallbackFontSpec {
    val fonts = FontHelper.getFallbackFonts(Fonts.FontOpts(familyName = name))
    if (fonts.isEmpty()) {
      throw Error("System font not found: $name")
    }
    val fontBytes = FontHelper.getFontBytes(fonts.first())
      ?: throw Error("Could not read font bytes for: $name")
    return HybridFallbackFont(fontBytes)
  }

  override fun getSystemDefaultFont(): HybridFallbackFontSpec {
    return HybridDefaultFallbackFont()
  }

  override fun setFontsForWeight(weight: Double, fonts: Array<HybridFallbackFontSpec>) {
    val key = weight.toInt()
    synchronized(fontsByWeight) {
      fontsByWeight[key] = fonts.toList()
    }
  }

  override fun applyFallbackFonts(): Promise<Unit> {
    return Promise.async {
      FontFallbackStrategy.stylePicker = object : FontFallbackStrategy {
        override fun getFont(weight: Fonts.Weight): List<ByteArray> {
          val requestedWeight = weight.weight
          val specs = synchronized(fontsByWeight) {
            fontsByWeight[requestedWeight] ?: fontsByWeight[DEFAULT_WEIGHT] ?: emptyList()
          }
          return specs.mapNotNull { spec ->
            when (spec) {
              is HybridDefaultFallbackFont ->
                FontHelper.getFallbackFontBytes(Fonts.FontOpts(weight = weight))
              is HybridFallbackFont ->
                spec.fontBytes
              else -> {
                Log.e(TAG, "Unknown fallback font spec type: ${spec::class.simpleName}")
                null
              }
            }
          }
        }
      }
      resetFontCache()
    }
  }

  override fun clearFallbackFonts(): Promise<Unit> {
    return Promise.async {
      synchronized(fontsByWeight) {
        fontsByWeight.clear()
      }
      FontFallbackStrategy.stylePicker = null
      resetFontCache()
    }
  }
}
