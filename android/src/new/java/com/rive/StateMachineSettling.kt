package com.rive

import android.util.Log
import app.rive.core.CommandQueue
import app.rive.core.StateMachineHandle
import kotlinx.coroutines.flow.StateFlow
import java.lang.reflect.InvocationTargetException
import java.lang.reflect.Method

/**
 * The worker keeps a per-machine settled state that `unsettleStateMachine`
 * resets, which also drops settle signals from advances made before the
 * reset. Both members are Kotlin-internal (upstream's Compose view uses them),
 * so reflection reaches them under their mangled JVM names.
 */
internal object StateMachineSettling {
  private const val TAG = "StateMachineSettling"

  private val unsettleMethod by lazy { findHandleMethod("unsettleStateMachine") }

  private val settledMethod by lazy { findHandleMethod("stateMachineSettled") }

  private fun findHandleMethod(prefix: String): Method? {
    val method = CommandQueue::class.java.declaredMethods.firstOrNull {
      it.name.startsWith(prefix) &&
        it.parameterTypes.contentEquals(arrayOf(Long::class.javaPrimitiveType))
    }
    if (method == null) Log.w(TAG, "$prefix not found")
    return method
  }

  /** Returns null when this rive-android has no settled state, so the view never settles. */
  @Suppress("UNCHECKED_CAST")
  fun settledState(worker: CommandQueue, handle: StateMachineHandle): StateFlow<Boolean>? {
    val method = settledMethod ?: return null
    return try {
      method.invoke(worker, handle.handle) as? StateFlow<Boolean>
    } catch (e: InvocationTargetException) {
      Log.w(TAG, "stateMachineSettled failed", e.targetException)
      null
    }
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
