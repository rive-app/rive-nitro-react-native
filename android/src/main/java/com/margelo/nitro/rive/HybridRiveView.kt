package com.margelo.nitro.rive

import android.util.Log
import com.facebook.react.uimanager.ThemedReactContext
import com.rive.RiveReactNativeView

class HybridRiveView(val context: ThemedReactContext) : HybridRiveViewSpec() {
  override val view: RiveReactNativeView = RiveReactNativeView(context)

  //region View Props
  override var autoPlay: Boolean = false
  override var autoBind: Boolean = false
  //endregion

  //region View Methods
  override fun play() = executeOnUiThread { view.play() }
  override fun pause() = executeOnUiThread { view.pause() }
  //endregion

  //region Internal
  override fun beforeUpdate() {
    super.beforeUpdate()
    Log.d("rive", "Before Update")
  }

  override fun afterUpdate() {
    super.afterUpdate()
    Log.d("rive", "After Update")
  }

  private fun executeOnUiThread(action: () -> Unit) {
    try {
      context.runOnUiQueueThread {
        Log.d("rive", "Running on thread: ${Thread.currentThread().name}")
        action()
      }
    } catch (e: Exception) {
      Log.d("rive", e.message.toString())
      throw Error(e.message) // TODO: Correctly handling errors (https://nitro.margelo.com/docs/errors)
    }
  }
  //endregion
}
