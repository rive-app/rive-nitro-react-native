package com.margelo.nitro.rive

import android.annotation.SuppressLint
import android.content.Context
import android.content.res.Resources
import android.net.Uri
import android.util.Log
import app.rive.runtime.kotlin.core.*
import com.margelo.nitro.NitroModules
import kotlinx.coroutines.*
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Deferred
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

  private fun downloadUrlAsset(url: String, listener: (ByteArray?) -> Unit) {
    if (!isValidUrl(url)) {
      logError("Invalid URL: $url")
      listener(null)
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
            withContext(Dispatchers.Main) {
              listener(null)
            }
            return@launch
          }
        }

        withContext(Dispatchers.Main) {
          listener(bytes)
        }
      } catch (e: Exception) {
        logError("Unable to download asset from URL: $url - ${e.message}")
        withContext(Dispatchers.Main) {
          listener(null)
        }
      }
    }
  }

  private fun loadResourceAsset(
    sourceAssetId: String,
    context: Context,
    listener: (ByteArray?) -> Unit
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
          withContext(Dispatchers.Main) {
            listener(null)
          }
        }
      } catch (e: IOException) {
        logError("IO Exception while reading resource: $sourceAssetId - ${e.message}")
        withContext(Dispatchers.Main) {
          listener(null)
        }
      } catch (e: Resources.NotFoundException) {
        logError("Resource not found: $sourceAssetId - ${e.message}")
        withContext(Dispatchers.Main) {
          listener(null)
        }
      } catch (e: Exception) {
        logError("Unexpected error while processing resource: $sourceAssetId - ${e.message}")
        withContext(Dispatchers.Main) {
          listener(null)
        }
      }
    }
  }

  private fun loadBundledAsset(
    sourceAsset: String,
    path: String?,
    context: Context,
    listener: (ByteArray?) -> Unit
  ) {
    scope.launch {
      try {
        val fullPath = if (path == null) sourceAsset else constructFilePath(sourceAsset, path)
        val bytes = readAssetBytes(context, fullPath)

        withContext(Dispatchers.Main) {
          listener(bytes)
        }
      } catch (e: Exception) {
        logError("Error loading bundled asset: $sourceAsset - ${e.message}")
        withContext(Dispatchers.Main) {
          listener(null)
        }
      }
    }
  }

  private fun processAssetBytes(bytes: ByteArray, asset: FileAsset) {
    when (asset) {
      is ImageAsset -> asset.image = RiveRenderImage.fromEncoded(bytes)
      is FontAsset -> asset.font = RiveFont.make(bytes)
      is AudioAsset -> asset.audio = RiveAudio.make(bytes)
    }
  }

  private fun handlePreloadedImage(image: HybridRiveImageSpec, asset: FileAsset) {
    if (asset is ImageAsset && image is HybridRiveImage) {
      asset.image = image.renderImage
    }
  }

  private fun loadAsset(assetData: ResolvedReferencedAsset, asset: FileAsset, context: Context): Deferred<Unit> {
    val deferred = CompletableDeferred<Unit>()

    // Check for pre-loaded image first
    if (assetData.image != null) {
      handlePreloadedImage(assetData.image, asset)
      deferred.complete(Unit)
      return deferred
    }

    val listener: (ByteArray?) -> Unit = { bytes ->
      if (bytes != null) {
        processAssetBytes(bytes, asset)
      }
      deferred.complete(Unit)
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
      else -> {
        deferred.complete(Unit)
      }
    }

    return deferred
  }

  fun updateAsset(assetData: ResolvedReferencedAsset, asset: FileAsset, context: Context): Deferred<Unit> {
    return loadAsset(assetData, asset, context)
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
