package com.margelo.nitro.rive

import android.annotation.SuppressLint
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Choreographer
import androidx.annotation.Keep
import app.rive.RiveFile
import app.rive.RiveFileSource
import app.rive.core.CommandQueue
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Custom RiveLog logger that routes all Rive C++ runtime logs through [RiveLog]
 * and broadcasts error messages to registered listeners. This captures C++ errors
 * from the Rive CommandQueue (e.g., "State machine not found", "Draw failed").
 */
object RiveErrorLogger : app.rive.RiveLog.Logger {
  private val listeners = mutableListOf<(String) -> Unit>()
  private val reportedErrors = mutableSetOf<String>()

  fun addListener(listener: (String) -> Unit) {
    // Idempotent: views re-register on every reload; duplicates would fan
    // out the same error N times to onError.
    synchronized(listeners) {
      if (!listeners.contains(listener)) listeners.add(listener)
    }
  }

  fun removeListener(listener: (String) -> Unit) {
    synchronized(listeners) { listeners.remove(listener) }
  }

  private fun broadcastError(tag: String, msg: String) {
    val key = "$tag:$msg"
    synchronized(reportedErrors) {
      if (!reportedErrors.add(key)) return
    }
    synchronized(listeners) {
      listeners.toList().forEach { it("[$tag] $msg") }
    }
  }

  fun resetReportedErrors() {
    synchronized(reportedErrors) { reportedErrors.clear() }
  }

  override fun v(tag: String, msg: () -> String) {
    RiveLog.d(tag, msg())
  }
  override fun d(tag: String, msg: () -> String) {
    RiveLog.d(tag, msg())
  }
  override fun i(tag: String, msg: () -> String) {
    RiveLog.i(tag, msg())
  }
  override fun w(tag: String, msg: () -> String) {
    RiveLog.w(tag, msg())
  }
  override fun e(tag: String, t: Throwable?, msg: () -> String) {
    val message = msg()
    RiveLog.e(tag, message)
    broadcastError(tag, message)
  }
}

@Keep
@DoNotStrip
class HybridRiveFileFactory : HybridRiveFileFactorySpec() {
  override val backend: String = "experimental"

  companion object {
    private const val TAG = "HybridRiveFileFactory"

    @Volatile
    private var sharedWorker: CommandQueue? = null
    private var pollingStarted = false

    @Synchronized
    fun getSharedWorker(): CommandQueue {
      if (app.rive.RiveLog.logger !is RiveErrorLogger) {
        app.rive.RiveLog.logger = RiveErrorLogger
        Log.d(TAG, "RiveErrorLogger installed")
      }
      return sharedWorker ?: CommandQueue().also {
        sharedWorker = it
        Log.d(TAG, "Created CommandQueue, refCount=${it.refCount}")
        startPolling(it)
      }
    }

    /**
     * The experimental Rive SDK's CommandQueue needs to be polled every frame
     * to process responses from the C++ command server. Without polling,
     * all suspend functions (like RiveFile.fromSource) hang indefinitely.
     */
    private fun startPolling(worker: CommandQueue) {
      if (pollingStarted) return
      pollingStarted = true
      Handler(Looper.getMainLooper()).post {
        val callback = object : Choreographer.FrameCallback {
          override fun doFrame(frameTimeNanos: Long) {
            try {
              worker.pollMessages()
            } catch (e: Exception) {
              Log.e(TAG, "pollMessages error", e)
            }
            Choreographer.getInstance().postFrameCallback(this)
          }
        }
        Choreographer.getInstance().postFrameCallback(callback)
      }
    }
  }

  private suspend fun buildRiveFile(
    data: ByteArray,
    referencedAssets: ReferencedAssetsType?
  ): HybridRiveFile {
    val worker = getSharedWorker()

    val registeredAssets = AssetLoader.registerAssets(referencedAssets, worker)

    val source = RiveFileSource.Bytes(data)
    val result = RiveFile.fromSource(source, worker)

    val riveFile = when (result) {
      is app.rive.Result.Success -> result.value
      is app.rive.Result.Error -> throw RuntimeException("Failed to load Rive file: ${result.throwable.message}", result.throwable)
      else -> throw RuntimeException("Failed to load Rive file: unexpected result")
    }

    return HybridRiveFile(riveFile, worker, registeredAssets)
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
      throw IllegalArgumentException("fromFileURL: URL must be a file URL: $fileURL")
    }

    return Promise.async {
      val uri = java.net.URI(fileURL)
      val path = uri.path ?: throw IllegalArgumentException("fromFileURL: Invalid URL: $fileURL")
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
