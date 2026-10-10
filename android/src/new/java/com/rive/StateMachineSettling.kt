package com.rive

import android.util.Log
import app.rive.core.CommandQueue
import app.rive.core.StateMachineHandle
import java.lang.reflect.InvocationTargetException

/**
 * `CommandQueue.settledFlow` reports a state machine as settled only once until
 * `unsettleStateMachine` re-arms it, which also drops settle signals from
 * advances made before the re-arm. That method is Kotlin-internal (upstream
 * calls it from its Compose view), so reflection reaches it under its mangled
 * JVM name.
 */
internal object StateMachineSettling {
  private const val TAG = "StateMachineSettling"

  private val unsettleMethod by lazy {
    val method = CommandQueue::class.java.declaredMethods.firstOrNull {
      it.name.startsWith("unsettleStateMachine") &&
        it.parameterTypes.contentEquals(arrayOf(Long::class.javaPrimitiveType))
    }
    if (method == null) Log.w(TAG, "unsettleStateMachine not found")
    method
  }

  /** Returns false when this rive-android has no unsettle entry point. */
  fun unsettle(worker: CommandQueue, handle: StateMachineHandle): Boolean {
    val method = unsettleMethod ?: return false
    return try {
      method.invoke(worker, handle.handle)
      true
    } catch (e: InvocationTargetException) {
      throw e.targetException
    }
  }
}
