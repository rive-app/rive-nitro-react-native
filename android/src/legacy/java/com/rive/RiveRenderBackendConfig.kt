package com.rive

import android.util.Log
import com.margelo.nitro.rive.AndroidRenderBackend

object RiveRenderBackendConfig {
  private const val TAG = "RiveRenderBackendConfig"

  fun set(backend: AndroidRenderBackend) {
    if (backend != AndroidRenderBackend.OPENGL) {
      Log.w(TAG, "setAndroidRenderBackend($backend) ignored: the legacy backend only supports OpenGL rendering.")
    }
  }
}
