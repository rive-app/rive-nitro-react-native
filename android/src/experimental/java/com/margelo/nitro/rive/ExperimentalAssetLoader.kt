package com.margelo.nitro.rive

import android.util.Log
import app.rive.AudioAsset
import app.rive.FontAsset
import app.rive.ImageAsset
import app.rive.core.CommandQueue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

object ExperimentalAssetLoader {
  private const val TAG = "ExperimentalAssetLoader"

  fun registerAssets(
    referencedAssets: ReferencedAssetsType?,
    riveWorker: CommandQueue
  ) {
    val assetsData = referencedAssets?.data ?: return
    val scope = CoroutineScope(Dispatchers.IO)

    for ((name, assetData) in assetsData) {
      val source = DataSourceResolver.resolve(assetData) ?: continue
      scope.launch {
        try {
          val loader = source.createLoader()
          val data = loader.load(source)
          val type = inferAssetType(name, data)
          registerAsset(data, name, type, riveWorker)
        } catch (e: Exception) {
          Log.e(TAG, "Failed to load asset '$name'", e)
        }
      }
    }
  }

  fun updateAssets(
    referencedAssets: ReferencedAssetsType,
    riveWorker: CommandQueue
  ) {
    val assetsData = referencedAssets.data ?: return
    val scope = CoroutineScope(Dispatchers.IO)

    for ((name, assetData) in assetsData) {
      val source = DataSourceResolver.resolve(assetData) ?: continue
      scope.launch {
        try {
          val loader = source.createLoader()
          val data = loader.load(source)
          val type = inferAssetType(name, data)
          registerAsset(data, name, type, riveWorker)
        } catch (e: Exception) {
          Log.e(TAG, "Failed to update asset '$name'", e)
        }
      }
    }
  }

  private suspend fun registerAsset(
    data: ByteArray,
    name: String,
    type: AssetType,
    riveWorker: CommandQueue
  ) {
    Log.i(TAG, "Registering $type asset '$name' (${data.size} bytes)")
    when (type) {
      AssetType.IMAGE -> {
        riveWorker.unregisterImage(name)
        val result = ImageAsset.fromBytes(riveWorker, data)
        if (result is app.rive.Result.Success) {
          result.value.register(name)
          Log.i(TAG, "Image '$name' registered")
        }
      }
      AssetType.FONT -> {
        riveWorker.unregisterFont(name)
        val result = FontAsset.fromBytes(riveWorker, data)
        if (result is app.rive.Result.Success) {
          result.value.register(name)
          Log.i(TAG, "Font '$name' registered")
        }
      }
      AssetType.AUDIO -> {
        riveWorker.unregisterAudio(name)
        val result = AudioAsset.fromBytes(riveWorker, data)
        if (result is app.rive.Result.Success) {
          result.value.register(name)
          Log.i(TAG, "Audio '$name' registered")
        }
      }
    }
  }

  private fun inferAssetType(name: String, data: ByteArray): AssetType {
    val ext = name.substringAfterLast('.', "").lowercase()
    return when (ext) {
      "png", "jpg", "jpeg", "webp", "gif", "bmp", "svg" -> AssetType.IMAGE
      "ttf", "otf", "woff", "woff2" -> AssetType.FONT
      "wav", "mp3", "ogg", "flac", "aac", "m4a" -> AssetType.AUDIO
      else -> inferFromMagicBytes(data)
    }
  }

  private fun inferFromMagicBytes(data: ByteArray): AssetType {
    if (data.size < 4) return AssetType.IMAGE

    // PNG: 89 50 4E 47
    if (data[0] == 0x89.toByte() && data[1] == 0x50.toByte() &&
      data[2] == 0x4E.toByte() && data[3] == 0x47.toByte()) return AssetType.IMAGE
    // JPEG: FF D8 FF
    if (data[0] == 0xFF.toByte() && data[1] == 0xD8.toByte() &&
      data[2] == 0xFF.toByte()) return AssetType.IMAGE
    // RIFF container: WebP (RIFF....WEBP) or WAV (RIFF....WAVE)
    if (data[0] == 0x52.toByte() && data[1] == 0x49.toByte() &&
      data[2] == 0x46.toByte() && data[3] == 0x46.toByte()) {
      if (data.size >= 12 &&
        data[8] == 0x57.toByte() && data[9] == 0x41.toByte() &&
        data[10] == 0x56.toByte() && data[11] == 0x45.toByte()) return AssetType.AUDIO // "WAVE"
      return AssetType.IMAGE // assume WebP for other RIFF
    }
    // ID3 (MP3): 49 44 33
    if (data[0] == 0x49.toByte() && data[1] == 0x44.toByte() &&
      data[2] == 0x33.toByte()) return AssetType.AUDIO
    // TrueType: 00 01 00 00
    if (data[0] == 0x00.toByte() && data[1] == 0x01.toByte() &&
      data[2] == 0x00.toByte() && data[3] == 0x00.toByte()) return AssetType.FONT
    // OpenType: 4F 54 54 4F ("OTTO")
    if (data[0] == 0x4F.toByte() && data[1] == 0x54.toByte() &&
      data[2] == 0x54.toByte() && data[3] == 0x4F.toByte()) return AssetType.FONT

    return AssetType.IMAGE
  }

  enum class AssetType { IMAGE, FONT, AUDIO }
}
