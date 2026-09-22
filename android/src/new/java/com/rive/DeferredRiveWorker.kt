package com.rive

import app.rive.RenderBackend
import app.rive.core.CommandQueue
import java.lang.reflect.InvocationTargetException

/**
 * rive-android only exposes its deferred (GPU Canvas) worker through the
 * Compose-only `rememberDeferredRiveWorker`; `CommandQueue.createDeferred` is
 * Kotlin-internal. Reflection reaches it under either its mangled JVM name or
 * a plain `createDeferred`, and a rive-android without it degrades to "GPU
 * Canvas unavailable" at runtime instead of failing the build.
 */
internal object DeferredRiveWorker {
  private val factory by lazy {
    val signature = arrayOf(RenderBackend::class.java, Boolean::class.javaPrimitiveType)
    CommandQueue.Companion::class.java.declaredMethods.firstOrNull {
      (it.name == "createDeferred" || it.name.startsWith("createDeferred$")) &&
        it.parameterTypes.contentEquals(signature)
    }
  }

  /** Null when this rive-android has no deferred worker entry point. */
  fun createOrNull(renderBackend: RenderBackend): CommandQueue? {
    val method = factory ?: return null
    return try {
      method.invoke(CommandQueue.Companion, renderBackend, false) as CommandQueue
    } catch (e: InvocationTargetException) {
      throw e.targetException
    }
  }
}
