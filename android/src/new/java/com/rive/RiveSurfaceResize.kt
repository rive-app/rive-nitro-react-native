package com.rive

import android.util.Log
import app.rive.core.RiveSurface
import java.lang.reflect.InvocationTargetException

/**
 * Upstream `RiveView` resizes its surface on every size change through the
 * Kotlin-internal `RiveSurface.resize`, so reflection reaches it under its
 * mangled JVM name (rive-app/rive-nitro-react-native#418).
 */
internal object RiveSurfaceResize {
  private const val TAG = "RiveSurfaceResize"

  private val resizeMethod by lazy {
    val signature = arrayOf(Int::class.javaPrimitiveType, Int::class.javaPrimitiveType)
    val method = RiveSurface::class.java.declaredMethods.firstOrNull {
      (it.name == "resize" || it.name.startsWith("resize$")) &&
        it.parameterTypes.contentEquals(signature)
    }
    if (method == null) Log.w(TAG, "RiveSurface.resize not found")
    method
  }

  /** Returns false when the surface keeps its previous size. */
  fun resize(surface: RiveSurface, width: Int, height: Int): Boolean {
    if (width <= 0 || height <= 0) return false
    val method = resizeMethod ?: return false
    return try {
      method.invoke(surface, width, height)
      true
    } catch (e: InvocationTargetException) {
      Log.w(TAG, "RiveSurface.resize(${width}x$height) failed", e.targetException)
      false
    } catch (e: ReflectiveOperationException) {
      Log.w(TAG, "RiveSurface.resize(${width}x$height) failed", e)
      false
    }
  }
}
