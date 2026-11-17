package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.ImageAsset
import app.rive.Result
import app.rive.ViewModelInstance
import app.rive.core.CommandQueue
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import com.rive.RiveReactNativeView

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

    // Every image write runs to completion in call order, so a clear cannot overtake a pending decode.
    private val writes = Channel<suspend () -> Unit>(Channel.UNLIMITED).also { queue ->
      CoroutineScope(Dispatchers.Default).launch { for (write in queue) write() }
    }
  }

  override fun set(image: HybridRiveImageSpec?) {
    setAsync(image).catch { Log.e(TAG, "Failed to set image for path '$path'", it) }
  }

  override fun setAsync(image: HybridRiveImageSpec?): Promise<Unit> {
    // Read now, since JS may dispose the image while the write is still queued.
    val bytes = (image as? HybridRiveImage)?.let {
      it.rawData ?: throw IllegalStateException("RiveImage has been disposed")
    }
    val promise = Promise<Unit>()
    writes.trySend {
      try {
        if (bytes == null) {
          instance.setImage(path, null)
        } else {
          when (val result = ImageAsset.fromBytes(riveWorker, bytes)) {
            // The property keeps its own ref, so close ours right away.
            is Result.Success -> result.value.use { instance.setImage(path, it) }
            is Result.Error -> throw result.throwable
            else -> throw IllegalStateException("Failed to decode image")
          }
        }
        RiveReactNativeView.onViewModelChanged()
        promise.resolve(Unit)
      } catch (e: Throwable) {
        promise.reject(e)
      }
    }
    return promise
  }

  override fun addListener(onChanged: () -> Unit): () -> Unit {
    // Image property listeners not supported in experimental API
    return {}
  }

  override fun removeListeners() {
    // no-op
  }
}
