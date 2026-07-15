package com.rive

import android.util.Log
import app.rive.RenderBackend
import com.margelo.nitro.rive.AndroidRenderBackend

/**
 * Process-wide render backend preference for the experimental backend's
 * shared CommandQueue. The choice only takes effect if set before the
 * worker is created (i.e. before the first Rive file is loaded).
 */
object RiveRenderBackendConfig {
  private const val TAG = "RiveRenderBackendConfig"

  @Volatile
  private var requested: RenderBackend = RenderBackend.OpenGL

  @Volatile
  private var workerCreated = false

  fun set(backend: AndroidRenderBackend) {
    if (workerCreated) {
      Log.w(
        TAG,
        "setAndroidRenderBackend($backend) ignored: the shared render worker already exists " +
          "(using $requested). Call it before loading any Rive files."
      )
      return
    }
    requested = when (backend) {
      AndroidRenderBackend.OPENGL -> RenderBackend.OpenGL
      AndroidRenderBackend.VULKAN -> RenderBackend.Vulkan
    }
  }

  fun resolveForWorker(): RenderBackend {
    workerCreated = true
    return requested
  }
}
