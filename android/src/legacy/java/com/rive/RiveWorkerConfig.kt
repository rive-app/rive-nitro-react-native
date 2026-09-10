package com.rive

import android.util.Log
import com.margelo.nitro.rive.AndroidRenderBackend

object RiveWorkerConfig {
  private const val TAG = "RiveWorkerConfig"

  fun setRenderBackend(backend: AndroidRenderBackend) {
    if (backend != AndroidRenderBackend.OPENGL) {
      Log.w(TAG, "setAndroidRenderBackend($backend) ignored: the legacy backend only supports OpenGL rendering.")
    }
  }

  fun setGPUCanvasEnabled(enabled: Boolean) {
    if (enabled) {
      Log.w(TAG, "setGPUCanvasEnabled(true) ignored: the legacy backend does not support GPU Canvas.")
    }
  }

  val isGPUCanvasEnabled: Boolean
    get() = false
}
