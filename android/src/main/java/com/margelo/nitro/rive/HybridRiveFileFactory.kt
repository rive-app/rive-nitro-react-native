package com.margelo.nitro.rive

import android.annotation.SuppressLint
import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.File
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import com.margelo.nitro.NitroModules
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URL

@Keep
@DoNotStrip
class HybridRiveFileFactory : HybridRiveFileFactorySpec() {
  override fun fromURL(url: String, loadCdn: Boolean): Promise<HybridRiveFileSpec> {
    return Promise.async {
      try {
        val riveFile = withContext(Dispatchers.IO) {
          val urlObj = URL(url)
          val riveData = urlObj.readBytes()
          // TODO: The File object in Android does not have the concept of loading CDN assets
          File(riveData)
        }

        val hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = riveFile
        hybridRiveFile
      } catch (e: Exception) {
        throw Error("Failed to download Rive file: ${e.message}")
      }
    }
  }

  @SuppressLint("DiscouragedApi")
  override fun fromResource(resource: String, loadCdn: Boolean): Promise<HybridRiveFileSpec> {
    return Promise.async {
      try {
        val context = NitroModules.applicationContext
          ?: throw Error("Could not load Rive file ($resource) from resource. No application context.")
        val riveFile = withContext(Dispatchers.IO) {
          val resourceId = context.resources.getIdentifier(resource, "raw", context.packageName)
          if (resourceId == 0) {
            throw Error("Could not find Rive file: $resource.riv")
          }
          val inputStream = context.resources.openRawResource(resourceId)
          val riveData = inputStream.readBytes()
          File(riveData)
        }

        val hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = riveFile
        hybridRiveFile
      } catch (e: Exception) {
        throw Error("Failed to load Rive file: ${e.message}")
      }
    }
  }

  override fun fromBytes(bytes: ArrayBuffer, loadCdn: Boolean): Promise<HybridRiveFileSpec> {
    val buffer = bytes.getBuffer(false) // Use false to avoid creating a read-only buffer
    return Promise.async {
      try {
        val byteArray = ByteArray(buffer.remaining())
        buffer.get(byteArray)
        val riveFile = File(byteArray)
        val hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = riveFile
        hybridRiveFile
      } catch (e: Exception) {
        throw Error("Failed to load Rive file from bytes: ${e.message}")
      }
    }
  }
}

