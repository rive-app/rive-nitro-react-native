package com.margelo.nitro.rive

import android.annotation.SuppressLint
import android.content.Context
import android.content.res.Resources
import android.net.Uri
import android.util.Log
import app.rive.runtime.kotlin.core.*
import com.margelo.nitro.NitroModules
import kotlinx.coroutines.*
import java.io.File as JavaFile
import java.io.IOException
import java.net.URI
import java.net.URL

typealias ReferencedAssetCache = MutableMap<String, FileAsset>

class ReferencedAssetLoader {
  private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

  private fun logError(message: String) {
    Log.e("ReferencedAssetLoader", message)
  }

  private fun isValidUrl(url: String): Boolean {
    return try {
      URL(url)
      true
    } catch (e: Exception) {
      false
    }
  }

  private fun constructFilePath(filename: String, path: String): String {
    return if (path.endsWith("/")) "$path$filename" else "$path/$filename"
  }

  @SuppressLint("DiscouragedApi")
  private fun getResourceId(source: String, context: Context): Int {
    val resourceTypes = listOf("raw", "drawable")

    for (type in resourceTypes) {
      val resourceId = context.resources.getIdentifier(source, type, context.packageName)
      if (resourceId != 0) {
        return resourceId
      }
    }

    return 0
  }

  private fun readAssetBytes(context: Context, fileName: String): ByteArray? {
    val assetManager = context.assets
    return try {
      assetManager.open(fileName).use { inputStream ->
        inputStream.readBytes()
      }
    } catch (e: IOException) {
      logError("Unable to read file from assets: $fileName - ${e.message}")
      null
    }
  }

  private fun downloadUrlAsset(url: String, listener: (ByteArray) -> Unit) {
    if (!isValidUrl(url)) {
      logError("Invalid URL: $url")
      return
    }

    scope.launch {
      try {
        val uri = URI(url)
        val bytes = when (uri.scheme) {
          "file" -> {
            val file = JavaFile(uri.path)
            if (!file.exists()) {
              throw IOException("File not found: ${uri.path}")
            }
            if (!file.canRead()) {
              throw IOException("Permission denied: ${uri.path}")
            }
            file.readBytes()
          }
          "http", "https" -> {
            URL(url).readBytes()
          }
          else -> {
            logError("Unsupported URL scheme: ${uri.scheme}")
            return@launch
          }
        }

        withContext(Dispatchers.Main) {
          listener(bytes)
        }
      } catch (e: Exception) {
        logError("Unable to download asset from URL: $url - ${e.message}")
      }
    }
  }

  private fun loadResourceAsset(
    sourceAssetId: String,
    context: Context,
    listener: (ByteArray) -> Unit
  ) {
    scope.launch {
      try {
        val scheme = runCatching { Uri.parse(sourceAssetId).scheme }.getOrNull()

        if (scheme != null) {
          downloadUrlAsset(sourceAssetId, listener)
          return@launch
        }

        val resourceId = getResourceId(sourceAssetId, context)

        if (resourceId != 0) {
          val bytes = context.resources.openRawResource(resourceId).use { inputStream ->
            inputStream.readBytes()
          }
          withContext(Dispatchers.Main) {
            listener(bytes)
          }
        } else {
          logError("Resource not found: $sourceAssetId")
        }
      } catch (e: IOException) {
        logError("IO Exception while reading resource: $sourceAssetId - ${e.message}")
      } catch (e: Resources.NotFoundException) {
        logError("Resource not found: $sourceAssetId - ${e.message}")
      } catch (e: Exception) {
        logError("Unexpected error while processing resource: $sourceAssetId - ${e.message}")
      }
    }
  }

  private fun loadBundledAsset(
    sourceAsset: String,
    path: String?,
    context: Context,
    listener: (ByteArray) -> Unit
  ) {
    scope.launch {
      try {
        val fullPath = if (path == null) sourceAsset else constructFilePath(sourceAsset, path)
        val bytes = readAssetBytes(context, fullPath)

        if (bytes != null) {
          withContext(Dispatchers.Main) {
            listener(bytes)
          }
        }
      } catch (e: Exception) {
        logError("Error loading bundled asset: $sourceAsset - ${e.message}")
      }
    }
  }

  private fun processAssetBytes(bytes: ByteArray, asset: FileAsset) {
    when (asset) {
      is ImageAsset -> asset.image = RiveRenderImage.make(bytes)
      is FontAsset -> asset.font = RiveFont.make(bytes)
      is AudioAsset -> asset.audio = RiveAudio.make(bytes)
    }
  }

  private fun loadAsset(assetData: ResolvedReferencedAsset, asset: FileAsset, context: Context) {
    val listener: (ByteArray) -> Unit = { bytes ->
      processAssetBytes(bytes, asset)
    }

    when {
      assetData.sourceAssetId != null -> {
        loadResourceAsset(assetData.sourceAssetId, context, listener)
      }
      assetData.sourceUrl != null -> {
        downloadUrlAsset(assetData.sourceUrl, listener)
      }
      assetData.sourceAsset != null -> {
        loadBundledAsset(assetData.sourceAsset, assetData.path, context, listener)
      }
    }
  }

  fun createCustomLoader(
    referencedAssets: ReferencedAssetsType?,
    cache: ReferencedAssetCache
  ): FileAssetLoader? {
    val assetsData = referencedAssets?.data ?: return null
    val context = NitroModules.applicationContext ?: return null

    return object : FileAssetLoader() {
      override fun loadContents(asset: FileAsset, inBandBytes: ByteArray): Boolean {
        var key = asset.uniqueFilename.substringBeforeLast(".")
        var assetData = assetsData[key]

        if (assetData == null) {
          key = asset.name
          assetData = assetsData[asset.name]
        }

        if (assetData == null) {
          return false
        }

        cache[key] = asset

        loadAsset(assetData, asset, context)

        return true
      }
    }
  }

  fun dispose() {
    scope.cancel()
  }
}
