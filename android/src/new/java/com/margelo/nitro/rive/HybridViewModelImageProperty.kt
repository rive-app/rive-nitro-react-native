package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.ImageAsset
import app.rive.ViewModelInstance
import app.rive.core.CommandQueue
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicInteger

// Shared by every wrapper for one instance path, since JS may look the property up again per set.
internal class ImagePropertySequencer {
  // Single-threaded so a clear cannot run between the generation check and setImage.
  val scope = CoroutineScope(Dispatchers.Default.limitedParallelism(1))

  // Decoding suspends, so a decode that finishes after a newer set or clear must be dropped.
  val generation = AtomicInteger()
}

@Keep
@DoNotStrip
class HybridViewModelImageProperty internal constructor(
  private val instance: ViewModelInstance,
  private val path: String,
  private val riveWorker: CommandQueue,
  private val sequencer: ImagePropertySequencer
) : HybridViewModelImagePropertySpec(),
  BaseHybridViewModelProperty<Unit> by BaseHybridViewModelPropertyImpl() {
  companion object {
    private const val TAG = "HybridViewModelImageProperty"
  }

  override fun set(image: HybridRiveImageSpec?) {
    applyImage(image).invokeOnCompletion { error ->
      if (error != null) Log.e(TAG, "Failed to set image for path '$path'", error)
    }
  }

  override fun setAsync(image: HybridRiveImageSpec?): Promise<Unit> {
    val applied = applyImage(image)
    return Promise.async { applied.await() }
  }

  private fun applyImage(image: HybridRiveImageSpec?): Deferred<Unit> {
    val hybridImage = image as? HybridRiveImage
    val gen = sequencer.generation.incrementAndGet()
    val applied = CompletableDeferred<Unit>()
    sequencer.scope.launch {
      try {
        if (hybridImage == null) {
          writeIfCurrent(gen, null)
        } else {
          // The property keeps its own ref, so close ours right away.
          ImageAsset.create(riveWorker, hybridImage.rawData).use { writeIfCurrent(gen, it) }
        }
        applied.complete(Unit)
      } catch (e: Exception) {
        if (sequencer.generation.get() == gen) {
          applied.completeExceptionally(e)
        } else {
          Log.w(TAG, "Ignoring failure of superseded image for path '$path'", e)
          applied.complete(Unit)
        }
      }
    }
    return applied
  }

  private fun writeIfCurrent(gen: Int, image: ImageAsset?) {
    if (sequencer.generation.get() == gen) instance.setImage(path, image)
  }

  override fun addListener(onChanged: () -> Unit): () -> Unit {
    // Image property listeners not supported in experimental API
    return {}
  }

  override fun removeListeners() {
    // no-op
  }
}
