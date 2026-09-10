package com.rive;

import app.rive.RenderBackend;
import app.rive.RiveInitializationException;
import app.rive.core.CommandQueue;

/**
 * rive-android 11.12 only reaches its deferred (GPU Canvas) worker through the
 * Compose-only {@code rememberDeferredRiveWorker}; {@code CommandQueue.createDeferred}
 * is Kotlin-internal. Java is not bound by Kotlin visibility, so this calls the
 * internal entry point under its mangled JVM name.
 */
public final class DeferredRiveWorker {
  private DeferredRiveWorker() {}

  public static CommandQueue create(RenderBackend renderBackend) throws RiveInitializationException {
    return CommandQueue.Companion.createDeferred$kotlin_release(renderBackend, false);
  }
}
