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

  override fun set(image: HybridRiveImageSpec?) {
    val hybridImage = image as? HybridRiveImage ?: return
    imageScope.launch {
      try {
        val result = ImageAsset.fromBytes(riveWorker, hybridImage.rawData)
        if (result is app.rive.Result.Success) {
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
