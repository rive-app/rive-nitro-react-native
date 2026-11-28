package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.ImageAsset
import app.rive.Result
import app.rive.RiveResourceClosedException
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
class HybridViewModelImageProperty internal constructor(
  private val owner: HybridViewModelInstance,
  private val path: String,
  private val riveWorker: CommandQueue
) : HybridViewModelImagePropertySpec(),
  BaseHybridViewModelProperty<Unit> by BaseHybridViewModelPropertyImpl(owner) {
  private val instance get() = owner.viewModelInstance

  companion object {
    // Every image write runs to completion in call order, so a clear cannot overtake a pending decode.
    private val writes = Channel<suspend () -> Unit>(Channel.UNLIMITED).also { queue ->
      CoroutineScope(Dispatchers.Default).launch { for (write in queue) write() }
    }
  }

  override fun setValueAsync(image: HybridRiveImageSpec?): Promise<Unit> = set(image)

  override fun set(image: HybridRiveImageSpec?): Promise<Unit> {
    // Read now, since JS may dispose the image while the write is still queued.
    val bytes = (image as? HybridRiveImage)?.let {
      it.rawData ?: throw IllegalStateException("RiveImage has been disposed")
    }
    val promise = Promise<Unit>()
    writes.trySend {
      try {
        // A write queued before the instance was disposed has nothing left to apply to.
        if (instance.closed) {
          promise.resolve(Unit)
          return@trySend
        }
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
      } catch (e: RiveResourceClosedException) {
        // JS can dispose the instance while the decode runs, after the check above.
        if (instance.closed) promise.resolve(Unit) else promise.reject(e)
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
