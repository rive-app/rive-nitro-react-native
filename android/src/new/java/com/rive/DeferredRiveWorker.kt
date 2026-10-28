package com.rive

import app.rive.ExperimentalDeferredRendering
import app.rive.RenderBackend
import app.rive.core.CommandQueue

/**
 * Creates the deferred (GPU Canvas) worker via the public
 * `CommandQueue(enableGPUCanvas = true)` constructor (rive-android 11.14.2+).
 */
internal object DeferredRiveWorker {
  @OptIn(ExperimentalDeferredRendering::class)
  fun create(renderBackend: RenderBackend): CommandQueue =
    CommandQueue(renderBackend = renderBackend, enableGPUCanvas = true)
}
