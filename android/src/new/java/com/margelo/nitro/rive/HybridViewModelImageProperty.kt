package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.ImageAsset
import app.rive.ViewModelInstance
import app.rive.core.CommandQueue
import com.facebook.proguard.annotations.DoNotStrip
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicInteger

@Keep
@DoNotStrip
class HybridViewModelImageProperty(
  private val instance: ViewModelInstance,
  private val path: String,
  private val riveWorker: CommandQueue
) : HybridViewModelImagePropertySpec(),
  BaseHybridViewModelProperty<Unit> by BaseHybridViewModelPropertyImpl() {
  companion object {
    private const val TAG = "HybridViewModelImageProperty"
  }

  // Single-threaded so a clear cannot run between the generation check and setImage.
  private val imageScope = CoroutineScope(Dispatchers.Default.limitedParallelism(1))

  // Decoding suspends, so a decode that finishes after a newer set or clear must be dropped.
  private val generation = AtomicInteger()

  override fun set(image: HybridRiveImageSpec?) {
    val hybridImage = image as? HybridRiveImage
    val gen = generation.incrementAndGet()
    imageScope.launch {
      try {
        if (hybridImage == null) {
          instance.setImage(path, null)
          return@launch
        }
        val result = ImageAsset.fromBytes(riveWorker, hybridImage.rawData)
        if (result is app.rive.Result.Success) {
          // The property keeps its own ref, so close ours right away.
          result.value.use { if (generation.get() == gen) instance.setImage(path, it) }
        } else {
          Log.e(TAG, "Failed to decode image for path '$path'")
        }
      } catch (e: Exception) {
        Log.e(TAG, "Failed to set image for path '$path'", e)
      }
    }
  }

  override fun addListener(onChanged: () -> Unit): () -> Unit {
    // Image property listeners not supported in experimental API
    return {}
  }

  override fun removeListeners() {
    // no-op
  }
}
