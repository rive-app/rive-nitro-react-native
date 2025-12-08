package com.margelo.nitro.rive

import android.annotation.SuppressLint
import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.File
import app.rive.runtime.kotlin.core.Rive
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URI

data class FileAndCache(
  val file: File,
  val cache: ReferencedAssetCache,
  val loader: ReferencedAssetLoader?
)

@Keep
@DoNotStrip
class HybridRiveFileFactory : HybridRiveFileFactorySpec() {
  private fun buildRiveFile(
    data: ByteArray,
    referencedAssets: ReferencedAssetsType?
  ): FileAndCache {
    val cache = mutableMapOf<String, app.rive.runtime.kotlin.core.FileAsset>()
    val loader = ReferencedAssetLoader()
    val customLoader = loader.createCustomLoader(referencedAssets, cache)

    // TODO: The File object in Android does not have the concept of loading CDN assets
    val riveFile = if (customLoader != null) {
      File(data, Rive.defaultRendererType, customLoader)
    } else {
      File(data)
    }

    return FileAndCache(riveFile, cache, if (customLoader != null) loader else null)
  }

  override fun fromURL(url: String, loadCdn: Boolean, referencedAssets: ReferencedAssetsType?): Promise<HybridRiveFileSpec> {
    return Promise.async {
      try {
        val fileAndCache = withContext(Dispatchers.IO) {
          val riveData = HTTPDataLoader.downloadBytes(url)
          buildRiveFile(riveData, referencedAssets)
        }

        val hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = fileAndCache.file
        hybridRiveFile.referencedAssetCache = fileAndCache.cache
        hybridRiveFile.assetLoader = fileAndCache.loader
        hybridRiveFile
      } catch (e: Exception) {
        throw Error("Failed to download Rive file: ${e.message}", e)
      }
    }
  }

  override fun fromFileURL(fileURL: String, loadCdn: Boolean, referencedAssets: ReferencedAssetsType?): Promise<HybridRiveFileSpec> {
    if (!fileURL.startsWith("file://")) {
      throw Error("fromFileURL: URL must be a file URL: $fileURL")
    }

    return Promise.async {
      try {
        val uri = URI(fileURL)
        val path = uri.path ?: throw Error("fromFileURL: Invalid URL: $fileURL")

        val fileAndCache = withContext(Dispatchers.IO) {
          val riveData = FileDataLoader.loadBytes(path)
          buildRiveFile(riveData, referencedAssets)
        }

        val hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = fileAndCache.file
        hybridRiveFile.referencedAssetCache = fileAndCache.cache
        hybridRiveFile.assetLoader = fileAndCache.loader
        hybridRiveFile
      } catch (e: Exception) {
        throw Error("Failed to load Rive file: ${e.message}")
      }
    }
  }

  @SuppressLint("DiscouragedApi")
  override fun fromResource(resource: String, loadCdn: Boolean, referencedAssets: ReferencedAssetsType?): Promise<HybridRiveFileSpec> {
    return Promise.async {
      try {
        val fileAndCache = withContext(Dispatchers.IO) {
          val riveData = ResourceDataLoader.loadBytes(resource)
          buildRiveFile(riveData, referencedAssets)
        }

        val hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = fileAndCache.file
        hybridRiveFile.referencedAssetCache = fileAndCache.cache
        hybridRiveFile.assetLoader = fileAndCache.loader
        hybridRiveFile
      } catch (e: Exception) {
        throw Error("Failed to load Rive file: ${e.message}")
      }
    }
  }

  override fun fromBytes(bytes: ArrayBuffer, loadCdn: Boolean, referencedAssets: ReferencedAssetsType?): Promise<HybridRiveFileSpec> {
    val buffer = bytes.getBuffer(false)
    return Promise.async {
      try {
        val byteArray = ByteArray(buffer.remaining())
        buffer.get(byteArray)
        val fileAndCache = buildRiveFile(byteArray, referencedAssets)
        val hybridRiveFile = HybridRiveFile()
        hybridRiveFile.riveFile = fileAndCache.file
        hybridRiveFile.referencedAssetCache = fileAndCache.cache
        hybridRiveFile.assetLoader = fileAndCache.loader
        hybridRiveFile
      } catch (e: Exception) {
        throw Error("Failed to load Rive file from bytes: ${e.message}")
      }
    }
  }
}
