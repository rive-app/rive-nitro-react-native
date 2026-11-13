package com.margelo.nitro.rive

import android.util.Log
import app.rive.AudioAsset
import app.rive.FontAsset
import app.rive.ImageAsset
import app.rive.core.CommandQueue
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.Dispatchers

/** An asset registered on the shared command queue on behalf of one file. */
class RegisteredAsset(
  private val name: String,
  private val asset: app.rive.Asset<*>
) {
  fun release() {
    runCatching { asset.unregister(name) }
    runCatching { asset.close() }
  }
}

object AssetLoader {
  private const val TAG = "AssetLoader"

  /**
   * Registers the referenced assets and returns them so the owning file can
   * release (unregister + close) them on dispose — registration is global
   * per name on the shared command queue, so without this the decoded bytes
   * accumulate for the app's lifetime.
   */
  suspend fun registerAssets(
    referencedAssets: ReferencedAssetsType?,
    riveWorker: CommandQueue
  ): List<RegisteredAsset> {
    val assetsData = referencedAssets?.data ?: return emptyList()

    return coroutineScope {
      assetsData
        .map { (name, assetData) ->
        async(Dispatchers.IO) {
          try {
            val source = DataSourceResolver.resolve(assetData) ?: return@async null
            val loader = source.createLoader()
            val data = loader.load(source)
            val type = inferAssetType(name, data, assetData.type)
            registerAsset(data, name, type, riveWorker)
          } catch (e: Exception) {
            Log.e(TAG, "Failed to load asset '$name'", e)
            null
          }
        }
      }.awaitAll()
        .filterNotNull()
    }
  }

  suspend fun updateAssets(
    referencedAssets: ReferencedAssetsType,
    riveWorker: CommandQueue
  ) {
    val assetsData = referencedAssets.data ?: return

    coroutineScope {
      assetsData
        .map { (name, assetData) ->
        async(Dispatchers.IO) {
          try {
            val source = DataSourceResolver.resolve(assetData) ?: return@async
            val loader = source.createLoader()
            val data = loader.load(source)
            val type = inferAssetType(name, data, assetData.type)
            registerAsset(data, name, type, riveWorker)
          } catch (e: Exception) {
            Log.e(TAG, "Failed to update asset '$name'", e)
          }
        }
      }.awaitAll()
    }
  }

  private suspend fun registerAsset(
    data: ByteArray,
    name: String,
    type: AssetType,
    riveWorker: CommandQueue
  ): RegisteredAsset? {
    Log.i(TAG, "Registering $type asset '$name' (${data.size} bytes)")
    when (type) {
      AssetType.IMAGE -> {
        riveWorker.unregisterImage(name)
        val result = ImageAsset.fromBytes(riveWorker, data)
        if (result is app.rive.Result.Success) {
          result.value.register(name)
          Log.i(TAG, "Image '$name' registered")
          return RegisteredAsset(name, result.value)
        }
      }
      AssetType.FONT -> {
        riveWorker.unregisterFont(name)
        val result = FontAsset.fromBytes(riveWorker, data)
        if (result is app.rive.Result.Success) {
          result.value.register(name)
          Log.i(TAG, "Font '$name' registered")
          return RegisteredAsset(name, result.value)
        }
      }
      AssetType.AUDIO -> {
        riveWorker.unregisterAudio(name)
        val result = AudioAsset.fromBytes(riveWorker, data)
        if (result is app.rive.Result.Success) {
          result.value.register(name)
          Log.i(TAG, "Audio '$name' registered")
          return RegisteredAsset(name, result.value)
        }
      }
    }
    return null
  }

  private fun inferAssetType(name: String, data: ByteArray, explicitType: RiveAssetType?): AssetType {
    // Explicit type provided by the caller — always preferred.
    when (explicitType) {
      RiveAssetType.IMAGE -> return AssetType.IMAGE
      RiveAssetType.FONT -> return AssetType.FONT
      RiveAssetType.AUDIO -> return AssetType.AUDIO
      null -> Unit
    }
    // No explicit type — fall back to extension / magic-byte inference.
    // Deprecated: provide `type` on your asset entry to avoid this.
    Log.w(
      TAG,
      "No type provided for '$name'. Falling back to extension/magic-byte inference — " +
      "set type: 'image' | 'font' | 'audio' on the asset to silence this warning."
    )
    val ext = name.substringAfterLast('.', "").lowercase()
    return when (ext) {
      "png", "jpg", "jpeg", "webp", "gif", "bmp", "svg" -> AssetType.IMAGE
      "ttf", "otf", "woff", "woff2" -> AssetType.FONT
      "wav", "mp3", "ogg", "flac", "aac", "m4a" -> AssetType.AUDIO
      else -> inferFromMagicBytes(data)
    }
  }

  private fun inferFromMagicBytes(data: ByteArray): AssetType {
    fun ByteArray.startsWith(vararg bytes: Int) =
      bytes.size <= size && bytes.indices.all { this[it] == bytes[it].toByte() }

    fun ByteArray.matchesAt(offset: Int, vararg bytes: Int) =
      offset + bytes.size <= size && bytes.indices.all { this[offset + it] == bytes[it].toByte() }

    return when {
      data.startsWith(0x89, 0x50, 0x4E, 0x47) -> AssetType.IMAGE // PNG
      data.startsWith(0xFF, 0xD8, 0xFF) -> AssetType.IMAGE // JPEG
      data.startsWith(0x49, 0x44, 0x33) -> AssetType.AUDIO // MP3 (ID3)
      data.startsWith(0x00, 0x01, 0x00, 0x00) -> AssetType.FONT // TrueType
      data.startsWith(0x4F, 0x54, 0x54, 0x4F) -> AssetType.FONT // OpenType (OTTO)
      data.startsWith(0x52, 0x49, 0x46, 0x46) ->
        if (data.matchesAt(8, 0x57, 0x41, 0x56, 0x45)) {
          AssetType.AUDIO // WAV (WAVE)
        } else if (data.matchesAt(8, 0x57, 0x45, 0x42, 0x50)) {
          AssetType.IMAGE // WebP (WEBP)
        } else {
          RiveLog.w(TAG, "Unknown RIFF asset, assuming IMAGE. Declare asset type explicitly to avoid this.")
          AssetType.IMAGE
        }
      else -> {
        RiveLog.w(TAG, "Could not infer asset type from magic bytes, assuming IMAGE. Declare asset type explicitly to avoid this.")
        AssetType.IMAGE
      }
    }
  }

  enum class AssetType { IMAGE, FONT, AUDIO }
}
