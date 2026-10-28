package com.margelo.nitro.rive

import android.util.Log
import app.rive.runtime.kotlin.core.*
import com.margelo.nitro.NitroModules
import kotlinx.coroutines.*

typealias ReferencedAssetCache = MutableMap<String, FileAsset>

class ReferencedAssetLoader {
  private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

  private fun logError(message: String) {
    Log.e("ReferencedAssetLoader", message)
  }

  private fun processAssetBytes(bytes: ByteArray, asset: FileAsset) {
    // decode() hands the asset the only ref; assigning a RiveRenderImage /
    // RiveFont / RiveAudio here would leak the wrapper's own ref.
    if (!asset.decode(bytes)) {
      logError("Failed to decode asset: ${asset.name}")
    }
  }

  private fun handlePreloadedImage(image: HybridRiveImageSpec, asset: FileAsset) {
    if (asset !is ImageAsset || image !is HybridRiveImage) return
    image.withRenderImage { asset.image = it }
  }

  private fun loadAsset(assetData: ResolvedReferencedAsset, asset: FileAsset): Deferred<Unit> {
    val deferred = CompletableDeferred<Unit>()

    if (assetData.image != null) {
      handlePreloadedImage(assetData.image, asset)
      deferred.complete(Unit)
      return deferred
    }

    val dataSource = try {
      DataSourceResolver.resolve(assetData)
    } catch (e: Exception) {
      logError("Failed to resolve asset: ${e.message}")
      deferred.complete(Unit)
      return deferred
    }

    if (dataSource == null) {
      deferred.complete(Unit)
      return deferred
    }

    scope.launch {
      try {
        val bytes = dataSource.createLoader().load(dataSource)
        withContext(Dispatchers.Main) {
          processAssetBytes(bytes, asset)
          deferred.complete(Unit)
        }
      } catch (e: Exception) {
        logError("Failed to load asset: ${e.message}")
        withContext(Dispatchers.Main) {
          deferred.complete(Unit)
        }
      }
    }

    return deferred
  }

  fun updateAsset(assetData: ResolvedReferencedAsset, asset: FileAsset): Deferred<Unit> {
    return loadAsset(assetData, asset)
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

        loadAsset(assetData, asset)

        return true
      }
    }
  }

  fun dispose() {
    scope.cancel()
  }
}
