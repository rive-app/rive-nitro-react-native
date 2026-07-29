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
import java.util.concurrent.atomic.AtomicLong

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

  private val imageScope = CoroutineScope(Dispatchers.Default)

  /**
   * Bumped by every set(). Decoding is async, so a slow decode can finish after a later set()
   * has already applied — the generation it captured lets it detect that and bail.
   */
  private val generation = AtomicLong(0)

  override fun set(image: HybridRiveImageSpec?) {
    if (image == null) {
      // rive-android's ViewModelInstance.setImage only accepts a non-null ImageAsset up to
      // 11.7.2. The nullable overload that clears the property landed upstream in
      // rive-app/rive-android#13261 and ships in the next release; until we bump the pin,
      // dropping the call is all we can do here. Clearing works on legacy and on iOS.
      Log.w(TAG, "Clearing image property '$path' is not supported by this rive-android version")
      return
    }
    val hybridImage = image as? HybridRiveImage ?: return
    val setGeneration = generation.incrementAndGet()
    imageScope.launch {
      try {
        val result = ImageAsset.fromBytes(riveWorker, hybridImage.rawData)
        if (result is app.rive.Result.Success) {
          if (generation.get() != setGeneration) return@launch
          instance.setImage(path, result.value)
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
