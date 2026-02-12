package com.margelo.nitro.rive

import android.annotation.SuppressLint
import android.util.Log
import androidx.annotation.Keep
import app.rive.RiveFile
import app.rive.RiveFileSource
import app.rive.core.CommandQueue
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Keep
@DoNotStrip
class HybridRiveFileFactory : HybridRiveFileFactorySpec() {
  companion object {
    private const val TAG = "HybridRiveFileFactory"

    @Volatile
    private var sharedWorker: CommandQueue? = null

    @Synchronized
    fun getSharedWorker(): CommandQueue {
      return sharedWorker ?: CommandQueue().also { sharedWorker = it }
    }
  }

  private suspend fun buildRiveFile(
    data: ByteArray,
    referencedAssets: ReferencedAssetsType?
  ): HybridRiveFile {
    val worker = getSharedWorker()

    ExperimentalAssetLoader.registerAssets(referencedAssets, worker)

    val source = RiveFileSource.Bytes(data)
    val result = RiveFile.fromSource(source, worker)

    val riveFile = when (result) {
      is app.rive.Result.Success -> result.value
      is app.rive.Result.Error -> throw Error("Failed to load Rive file: ${result.throwable.message}")
      else -> throw Error("Failed to load Rive file: unexpected result")
    }

    return HybridRiveFile(riveFile, worker)
  }

  override fun fromURL(url: String, loadCdn: Boolean, referencedAssets: ReferencedAssetsType?): Promise<HybridRiveFileSpec> {
    return Promise.async {
      val data = withContext(Dispatchers.IO) {
        HTTPDataLoader.downloadBytes(url)
      }
      buildRiveFile(data, referencedAssets)
    }
  }

  override fun fromFileURL(fileURL: String, loadCdn: Boolean, referencedAssets: ReferencedAssetsType?): Promise<HybridRiveFileSpec> {
    if (!fileURL.startsWith("file://")) {
      throw Error("fromFileURL: URL must be a file URL: $fileURL")
    }

    return Promise.async {
      val uri = java.net.URI(fileURL)
      val path = uri.path ?: throw Error("fromFileURL: Invalid URL: $fileURL")
      val data = withContext(Dispatchers.IO) {
        FileDataLoader.loadBytes(path)
      }
      buildRiveFile(data, referencedAssets)
    }
  }

  @SuppressLint("DiscouragedApi")
  override fun fromResource(resource: String, loadCdn: Boolean, referencedAssets: ReferencedAssetsType?): Promise<HybridRiveFileSpec> {
    return Promise.async {
      val data = withContext(Dispatchers.IO) {
        ResourceDataLoader.loadBytes(resource)
      }
      buildRiveFile(data, referencedAssets)
    }
  }

  override fun fromBytes(bytes: ArrayBuffer, loadCdn: Boolean, referencedAssets: ReferencedAssetsType?): Promise<HybridRiveFileSpec> {
    val buffer = bytes.getBuffer(false)
    return Promise.async {
      val byteArray = ByteArray(buffer.remaining())
      buffer.get(byteArray)
      buildRiveFile(byteArray, referencedAssets)
    }
  }
}
