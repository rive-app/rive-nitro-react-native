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
import java.security.MessageDigest
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write

typealias ReferencedAssetCache = MutableMap<String, FileAsset>

class ReferencedAssetLoader {
  private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
  private val cacheLock = ReentrantReadWriteLock()

  private fun logError(message: String) {
    Log.e("ReferencedAssetLoader", message)
  }

  private fun logDebug(message: String) {
    Log.d("ReferencedAssetLoader", message)
  }

  /**
   * Get the cache directory for storing CDN assets
   */
  private fun getCacheDir(context: Context): JavaFile {
    val cacheDir = context.cacheDir
    val riveCacheDir = JavaFile(cacheDir, "rive_assets")
    if (!riveCacheDir.exists()) {
      riveCacheDir.mkdirs()
    }
    return riveCacheDir
  }

  /**
   * Generate a cache key from a URL or UUID
   */
  private fun generateCacheKey(urlOrUuid: String): String {
    return try {
      val md = MessageDigest.getInstance("MD5")
      val hashBytes = md.digest(urlOrUuid.toByteArray())
      hashBytes.joinToString("") { "%02x".format(it) }
    } catch (e: Exception) {
      // Fallback to hash code if MD5 is not available
      urlOrUuid.hashCode().toString().replace("-", "")
    }
  }

  /**
   * Get cached file path for a URL/UUID
   */
  private fun getCachedFilePath(context: Context, urlOrUuid: String): JavaFile {
    val cacheKey = generateCacheKey(urlOrUuid)
    return JavaFile(getCacheDir(context), cacheKey)
  }

  /**
   * Check if a cached file exists and is valid
   */
  private fun getCachedAsset(context: Context, urlOrUuid: String): ByteArray? {
    return cacheLock.read {
      val cacheFile = getCachedFilePath(context, urlOrUuid)
      if (!cacheFile.exists()) {
        logDebug("Cache miss for: $urlOrUuid")
        return@read null
      }

      try {
        val data = cacheFile.readBytes()
        if (data.isNotEmpty()) {
          logDebug("Cache hit for: $urlOrUuid")
          return@read data
        }
      } catch (e: Exception) {
        logDebug("Error reading cache for $urlOrUuid: ${e.message}")
      }

      null
    }
  }

  /**
   * Save asset data to cache
   */
  private fun saveToCache(context: Context, urlOrUuid: String, data: ByteArray) {
    scope.launch(Dispatchers.IO) {
      cacheLock.write {
        val cacheFile = getCachedFilePath(context, urlOrUuid)
        try {
          cacheFile.writeBytes(data)
          logDebug("Saved to cache: $urlOrUuid (${data.size} bytes)")
        } catch (e: Exception) {
          logDebug("Error saving cache for $urlOrUuid: ${e.message}")
        }
      }
    }
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

  private fun downloadUrlAsset(url: String, context: Context, listener: (ByteArray?) -> Unit) {
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
            val fileBytes = file.readBytes()
            fileBytes
          }
          "http", "https" -> {
            // Check cache first for HTTP/HTTPS URLs
            val cachedData = getCachedAsset(context, url)
            if (cachedData != null) {
              withContext(Dispatchers.Main) {
                listener(cachedData)
              }
              return@launch
            }

            // Download from network
            val downloadedBytes = URL(url).readBytes()

            // Save to cache
            saveToCache(context, url, downloadedBytes)

            downloadedBytes
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
          downloadUrlAsset(sourceAssetId, context, listener)
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
    if (bytes.isEmpty()) {
      return
    }

    when (asset) {
      is ImageAsset -> asset.image = RiveRenderImage.make(bytes)
      is FontAsset -> asset.font = RiveFont.make(bytes)
      is AudioAsset -> asset.audio = RiveAudio.make(bytes)
    }
  }

  private fun loadAsset(assetData: ResolvedReferencedAsset, asset: FileAsset, context: Context): Deferred<Unit> {
    val deferred = CompletableDeferred<Unit>()
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
        downloadUrlAsset(assetData.sourceUrl, context, listener)
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
        // Check for CDN URL/UUID first (only if both are non-empty)
        val cdnUrl = asset.cdnUrl

        if (cdnUrl != null && cdnUrl.isNotEmpty()) {
          logDebug("Loading CDN asset from URL: $cdnUrl")

          val cached = getCachedAsset(context, cdnUrl)
          if (cached != null) {
            // Use cached version
            scope.launch(Dispatchers.IO) {
              processAssetBytes(cached, asset)
            }
            cache[asset.uniqueFilename.substringBeforeLast(".")] = asset
            cache[asset.name] = asset
            return true
          } else {
            // Download and cache
            cache[asset.uniqueFilename.substringBeforeLast(".")] = asset
            cache[asset.name] = asset

            val cdnAssetData = ResolvedReferencedAsset(
              sourceUrl = cdnUrl,
              sourceAssetId = null,
              sourceAsset = null,
              path = null
            )
            loadAsset(cdnAssetData, asset, context)
            return true
          }
        }

        var key = asset.uniqueFilename.substringBeforeLast(".")
        var assetData = assetsData[key]
        cache[key] = asset
        cache[asset.name] = asset

        if (assetData == null) {
          key = asset.name
          assetData = assetsData[asset.name]
        }

        if (assetData == null) {
          return false
        }

        loadAsset(assetData, asset, context)

        return true
      }
    }
  }

  fun dispose() {
    scope.cancel()
  }
}
