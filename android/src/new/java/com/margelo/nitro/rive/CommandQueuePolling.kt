package com.margelo.nitro.rive

import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.Choreographer
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import app.rive.RiveResourceClosedException
import app.rive.core.CommandQueue
import com.facebook.react.bridge.UiThreadUtil
import com.margelo.nitro.core.Promise
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.onCompletion
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.runBlocking

/**
 * Polls the shared [CommandQueue], which is the only way its replies, property updates and
 * settled signals are delivered. It polls every frame only while something can produce messages:
 * a call waiting for a reply, or a recent [poke] (a rendering view or a view-model write).
 * Otherwise it polls every [IDLE_POLL_MS] while a property listener is active, and not at all
 * when nothing is listening or the app is in the background (issue #413).
 */
internal object CommandQueuePolling {
  private const val TAG = "CommandQueuePolling"

  // Long enough for the command server to answer a write or a view's last advance.
  private const val POKE_WINDOW_MS = 250L
  private const val IDLE_POLL_MS = 250L

  // Main thread only.
  private var worker: CommandQueue? = null
  private var frameScheduled = false
  private var idlePollScheduled = false

  @Volatile
  private var foreground = true

  @Volatile
  private var pokedUntilMs = 0L

  private val pendingReplies = AtomicInteger(0)
  private val activeListeners = AtomicInteger(0)
  private val handler = Handler(Looper.getMainLooper())

  private val pollCallback = Choreographer.FrameCallback {
    frameScheduled = false
    poll()
  }

  private val idlePoll = Runnable {
    idlePollScheduled = false
    if (!frameScheduled) poll()
  }

  fun start(worker: CommandQueue) {
    UiThreadUtil.runOnUiThread {
      if (this.worker != null) return@runOnUiThread
      this.worker = worker
      val lifecycle = ProcessLifecycleOwner.get().lifecycle
      // INITIALIZED means the app disabled ProcessLifecycleOwner's initializer, so it will never
      // report foreground; treat the app as always in the foreground.
      foreground = lifecycle.currentState == Lifecycle.State.INITIALIZED ||
        lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)
      lifecycle.addObserver(object : DefaultLifecycleObserver {
        override fun onStart(owner: LifecycleOwner) {
          foreground = true
          poke()
        }

        override fun onStop(owner: LifecycleOwner) {
          foreground = false
        }
      })
      schedule()
    }
  }

  /** Polls every frame for the next [POKE_WINDOW_MS]. */
  fun poke() {
    pokedUntilMs = SystemClock.uptimeMillis() + POKE_WINDOW_MS
    if (UiThreadUtil.isOnUiThread()) schedule() else UiThreadUtil.runOnUiThread { schedule() }
  }

  suspend fun <T> awaitingReply(block: suspend () -> T): T {
    if (pendingReplies.getAndIncrement() == 0) {
      UiThreadUtil.runOnUiThread { schedule() }
    }
    try {
      return block()
    } finally {
      pendingReplies.decrementAndGet()
    }
  }

  /** Keeps polling, at least every [IDLE_POLL_MS], while [flow] is collected. */
  fun <T> whileCollected(flow: Flow<T>): Flow<T> {
    val started = flow.onStart {
      activeListeners.incrementAndGet()
      poke()
    }
    return started.onCompletion { activeListeners.decrementAndGet() }
  }

  private fun poll() {
    val worker = worker ?: return
    try {
      worker.pollMessages()
    } catch (e: RiveResourceClosedException) {
      Log.e(TAG, "Command queue closed, polling stopped", e)
      this.worker = null
      return
    } catch (e: Exception) {
      Log.e(TAG, "pollMessages error", e)
    }
    schedule()
  }

  private fun schedule() {
    if (worker == null) return
    val everyFrame = pendingReplies.get() > 0 ||
      (foreground && SystemClock.uptimeMillis() < pokedUntilMs)
    if (everyFrame) {
      if (!frameScheduled) {
        frameScheduled = true
        Choreographer.getInstance().postFrameCallback(pollCallback)
      }
    } else if (foreground && activeListeners.get() > 0 && !idlePollScheduled) {
      idlePollScheduled = true
      handler.postDelayed(idlePoll, IDLE_POLL_MS)
    }
  }
}

/** [runBlocking] for work that waits on a [CommandQueue] reply. */
internal fun <T> runBlockingAwaitingReply(block: suspend () -> T): T {
  // Replies are polled on the main thread, so blocking it would never return.
  check(!UiThreadUtil.isOnUiThread()) { "Blocking on a Rive reply from the main thread" }
  return runBlocking { CommandQueuePolling.awaitingReply(block) }
}

/** [Promise.async] for work that waits on a [CommandQueue] reply. */
internal fun <T> promiseAwaitingReply(block: suspend () -> T): Promise<T> =
  Promise.async { CommandQueuePolling.awaitingReply(block) }
