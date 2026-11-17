package com.margelo.nitro.rive

import com.margelo.nitro.core.Promise
import java.util.concurrent.ConcurrentHashMap

private val pendingOwners = ConcurrentHashMap<Any, Any>()

/**
 * [Promise.async] that keeps [owner] strongly reachable until [block] completes, so the
 * owner's finalizer can't close native objects that [block] captured directly.
 */
internal fun <T> asyncRetaining(owner: Any, block: suspend () -> T): Promise<T> {
  val key = Any()
  pendingOwners[key] = owner
  return Promise.async {
    try {
      block()
    } finally {
      pendingOwners.remove(key)
    }
  }
}
