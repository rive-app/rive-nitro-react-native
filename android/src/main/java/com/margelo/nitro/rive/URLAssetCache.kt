package com.margelo.nitro.rive

import android.content.Context
import android.util.Log
import com.margelo.nitro.NitroModules
import java.io.File
import java.security.MessageDigest

object URLAssetCache {
  private const val CACHE_DIR_NAME = "rive_url_assets"
  private const val TAG = "URLAssetCache"

  private fun getCacheDir(): File? {
    val context = NitroModules.applicationContext ?: return null
    val cacheDir = File(context.cacheDir, CACHE_DIR_NAME)
    if (!cacheDir.exists()) {
      cacheDir.mkdirs()
    }
    return cacheDir
  }

  private fun urlToCacheKey(url: String): String {
    val digest = MessageDigest.getInstance("SHA-256")
    val hashBytes = digest.digest(url.toByteArray())
    return hashBytes.joinToString("") { "%02x".format(it) }
  }

  private fun getCacheFile(url: String): File? {
    val cacheDir = getCacheDir() ?: return null
    val cacheKey = urlToCacheKey(url)
    return File(cacheDir, cacheKey)
  }

  fun getCachedData(url: String): ByteArray? {
    return try {
      val cacheFile = getCacheFile(url) ?: return null
      if (cacheFile.exists() && cacheFile.length() > 0) {
        cacheFile.readBytes()
      } else {
        null
      }
    } catch (e: Exception) {
      Log.e(TAG, "Failed to read from cache: ${e.message}")
      null
    }
  }

  fun saveToCache(url: String, data: ByteArray) {
    try {
      val cacheFile = getCacheFile(url) ?: return
      cacheFile.writeBytes(data)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to save to cache: ${e.message}")
    }
  }

  fun clearCache() {
    try {
      val cacheDir = getCacheDir() ?: return
      cacheDir.listFiles()?.forEach { it.delete() }
    } catch (e: Exception) {
      Log.e(TAG, "Failed to clear cache: ${e.message}")
    }
  }
}
