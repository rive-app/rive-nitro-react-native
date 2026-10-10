package com.rive

/**
 * Copy of rive-android's internal `RiveFramePacer` (app/rive/RiveFrameRate.kt); keep the two in
 * sync. Tracks frame-rate cap timing without owning platform frame callbacks.
 *
 * The caller should use [delayBeforeNextFrameNs] to sleep until close to the next target render
 * time, then still await the platform frame clock before rendering.
 *
 * @param framesPerSecond Maximum frames per second, or null to render on every frame callback.
 */
internal class RiveFramePacer(framesPerSecond: Double?) {
  private val periodNs = framesPerSecond
    ?.takeIf { it.isFinite() && it > 0 }
    ?.let { Math.round(1_000_000_000.0 / it).coerceAtLeast(1L) }
  private var nextRenderTimeNs = 0L

  /**
   * Returns how long to delay before requesting another platform frame callback, or 0 when no
   * delay should be applied.
   *
   * @param nowNs Current monotonic time, in the same time base as frame callbacks.
   */
  fun delayBeforeNextFrameNs(nowNs: Long): Long {
    val activePeriodNs = periodNs ?: return 0L
    if (nextRenderTimeNs == 0L) {
      return 0L
    }

    // Wake before the target time so the caller can await the next platform frame callback.
    return (nextRenderTimeNs - nowNs - EARLY_WAKE_NS)
      .coerceAtLeast(0L)
      .coerceAtMost(activePeriodNs)
  }

  /** Attempts to accept [frameTimeNs] as the next Rive frame; true when the caller should draw. */
  fun tryScheduleFrame(frameTimeNs: Long): Boolean {
    val activePeriodNs = periodNs ?: return true
    if (nextRenderTimeNs != 0L && frameTimeNs < nextRenderTimeNs) {
      return false
    }

    if (nextRenderTimeNs == 0L) {
      nextRenderTimeNs = frameTimeNs + activePeriodNs
      return true
    }

    val periodsMissed = ((frameTimeNs - nextRenderTimeNs) / activePeriodNs) + 1L
    nextRenderTimeNs += periodsMissed * activePeriodNs

    return true
  }

  /** Restarts pacing so the next frame callback renders immediately. */
  fun reset() {
    nextRenderTimeNs = 0L
  }

  private companion object {
    // Coarse wake headroom before the next target frame time.
    const val EARLY_WAKE_NS = 4_000_000L
  }
}
