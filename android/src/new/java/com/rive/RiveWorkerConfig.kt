package com.rive

import android.util.Log
import app.rive.RenderBackend
import app.rive.core.CommandQueue
import com.margelo.nitro.rive.AndroidRenderBackend
import com.margelo.nitro.rive.RiveLog

/**
 * Process-wide options for the new runtime's shared CommandQueue. They only
 * take effect if set before the worker is created (i.e. before the first Rive
 * file is loaded); once [createWorker] has succeeded, later calls are logged
 * and ignored.
 */
object RiveWorkerConfig {
  private const val TAG = "RiveWorkerConfig"

  data class Resolved(val renderBackend: RenderBackend, val gpuCanvasEnabled: Boolean)

  private var requestedBackend: RenderBackend = RenderBackend.OpenGL
  private var requestedGPUCanvas = false
  private var resolved: Resolved? = null

  @Synchronized
  fun setRenderBackend(backend: AndroidRenderBackend) {
    resolved?.let {
      Log.w(
        TAG,
        "setAndroidRenderBackend($backend) ignored: the shared render worker already exists " +
          "(using ${it.renderBackend}). Call it before loading any Rive files."
      )
      return
    }
    requestedBackend = when (backend) {
      AndroidRenderBackend.OPENGL -> RenderBackend.OpenGL
      AndroidRenderBackend.VULKAN -> RenderBackend.Vulkan
    }
  }

  @Synchronized
  fun setGPUCanvasEnabled(enabled: Boolean) {
    resolved?.let {
      Log.w(
        TAG,
        "setGPUCanvasEnabled($enabled) ignored: the shared render worker already exists " +
          "(GPU Canvas ${if (it.gpuCanvasEnabled) "enabled" else "disabled"}). " +
          "Call it before loading any Rive files."
      )
      return
    }
    requestedGPUCanvas = enabled
  }

  val isGPUCanvasEnabled: Boolean
    @Synchronized get() = resolved?.gpuCanvasEnabled ?: requestedGPUCanvas

  /** The options the shared worker was built with; null until [createWorker] succeeds. */
  val current: Resolved?
    @Synchronized get() = resolved

  /**
   * Builds the shared worker from the requested options. GPU Canvas falls back
   * to a regular worker when this rive-android has no deferred entry point.
   */
  @Synchronized
  fun createWorker(): CommandQueue {
    val backend = requestedBackend
    val deferred = if (requestedGPUCanvas) DeferredRiveWorker.createOrNull(backend) else null
    if (requestedGPUCanvas && deferred == null) {
      RiveLog.w(
        TAG,
        "GPU Canvas is not available in this rive-android version; rendering without it. " +
          "3D content will not draw."
      )
    }
    val worker = deferred ?: CommandQueue(backend)
    resolved = Resolved(backend, gpuCanvasEnabled = deferred != null)
    return worker
  }
}
