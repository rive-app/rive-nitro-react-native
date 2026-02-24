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
import java.util.Collections
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Keep
@DoNotStrip
class HybridRiveFontConfig : HybridRiveFontConfigSpec() {
  companion object {
    private const val TAG = "RiveFonts"
    private var systemFallbackEnabled = false
    private val customFonts: MutableList<ByteArray> = Collections.synchronizedList(mutableListOf())

    private val fontFallbackStrategy = object : FontFallbackStrategy {
      override fun getFont(weight: Fonts.Weight): List<ByteArray> {
        val result = mutableListOf<ByteArray>()
        synchronized(customFonts) {
          result.addAll(customFonts)
        }
        val systemFonts = FontHelper.getFallbackFonts(Fonts.FontOpts(weight = weight))
        for (font in systemFonts) {
          try {
            FontHelper.getFontBytes(font)?.let { result.add(it) }
          } catch (e: OutOfMemoryError) {
            Log.w(TAG, "Skipped system font due to memory pressure: ${e.message}")
            break
          }
        }
        return result
      }
    }

    private fun ensureSystemFallback() {
      if (systemFallbackEnabled) return
      FontFallbackStrategy.stylePicker = fontFallbackStrategy
      systemFallbackEnabled = true
    }

    private fun resetFontCache() {
      try {
        FontFallbackStrategy.cppResetFontCache()
      } catch (e: Exception) {
        Log.e(TAG, "Failed to reset font cache: ${e.message}")
      }
    }
  }

  override fun enableSystemFontFallback(): Promise<Unit> {
    return Promise.async {
      ensureSystemFallback()
    }
  }

  override fun addFallbackFont(bytes: ArrayBuffer): Promise<Unit> {
    return Promise.async {
      ensureSystemFallback()
      val buffer = bytes.getBuffer(false)
      val byteArray = ByteArray(buffer.remaining())
      buffer.get(byteArray)
      customFonts.add(byteArray)
    }
  }

  override fun addFallbackFontFromResource(resource: String): Promise<Unit> {
    return Promise.async {
      ensureSystemFallback()
      val context = NitroModules.applicationContext
        ?: throw Error("Application context not available")

      val resName = resource.substringBeforeLast(".")

      val rawId = context.resources.getIdentifier(resName, "raw", context.packageName)
      if (rawId != 0) {
        val fontBytes = context.resources.openRawResource(rawId).use { it.readBytes() }
        customFonts.add(fontBytes)
        return@async
      }

      val fontId = context.resources.getIdentifier(resName, "font", context.packageName)
      if (fontId != 0) {
        val fontBytes = context.resources.openRawResource(fontId).use { it.readBytes() }
        customFonts.add(fontBytes)
        return@async
      }

      val assetPaths = listOf("fonts/$resource", resource)
      for (assetPath in assetPaths) {
        try {
          val fontBytes = context.assets.open(assetPath).use { it.readBytes() }
          customFonts.add(fontBytes)
          return@async
        } catch (_: Exception) {
        }
      }

      throw Error("Font resource not found: $resource (checked res/raw, res/font, assets/fonts)")
    }
  }

  override fun addFallbackFontFromURL(url: String): Promise<Unit> {
    return Promise.async {
      ensureSystemFallback()
      val fontBytes = withContext(Dispatchers.IO) {
        URL(url).readBytes()
      }
      customFonts.add(fontBytes)
    }
  }

  override fun addFallbackFontByName(name: String): Promise<Unit> {
    return Promise.async {
      ensureSystemFallback()
      val fonts = FontHelper.getFallbackFonts(Fonts.FontOpts(familyName = name))
      if (fonts.isEmpty()) {
        throw Error("System font not found: $name")
      }
      val fontBytes = FontHelper.getFontBytes(fonts.first())
        ?: throw Error("Could not read font bytes for: $name")
      customFonts.add(fontBytes)
    }
  }

  override fun applyFallbackFonts(): Promise<Unit> {
    return Promise.async {
      resetFontCache()
    }
  }

  override fun clearCustomFallbackFonts(): Promise<Unit> {
    return Promise.async {
      customFonts.clear()
      resetFontCache()
    }
  }
}
