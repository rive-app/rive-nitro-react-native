package com.margelo.nitro.rive

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.uimanager.ThemedReactContext
import com.rive.RiveReactNativeView
import com.rive.ViewConfiguration
import app.rive.runtime.kotlin.core.Fit as RiveFit

object DefaultConfiguration {
  const val AUTOBIND = false
  const val AUTOPLAY = true
  val fit = RiveFit.CONTAIN
}

@Keep
@DoNotStrip
class HybridRiveView(val context: ThemedReactContext) : HybridRiveViewSpec() {
  override val view: RiveReactNativeView = RiveReactNativeView(context)

  //region View Props
  private fun <T> changed(current: T, new: T, setter: (T) -> Unit) {
    if (current != new) {
      setter(new)
      needsReload = true
    }
  }

  override var artboardName: String? = null
    set(value) { changed(field, value) { field = it } }
  override var stateMachineName: String? = null
    set(value) { changed(field, value) { field = it } }
  override var autoPlay: Boolean? = null
    set(value) { changed(field, value) { field = it } }
  override var autoBind: Boolean? = null
    set(value) { changed(field, value) { field = it } }
  override var file: HybridRiveFileSpec = HybridRiveFile()
    set(value) { changed(field, value) { field = it } }
  override var fit: Fit? = null
  //endregion

  //region View Methods
  override fun bindViewModelInstance(viewModelInstance: HybridViewModelInstanceSpec) = executeOnUiThread {
    val hybridVmi = viewModelInstance as? HybridViewModelInstance ?: return@executeOnUiThread;
    view.bindViewModelInstance(hybridVmi.viewModelInstance)
  }
  override fun play() = executeOnUiThread { view.play() }
  override fun pause() = executeOnUiThread { view.pause() }
  //endregion

  //region Update
  override fun afterUpdate() {
    super.afterUpdate()
    val riveFile = (file as? HybridRiveFile)?.riveFile ?: return

    val config = ViewConfiguration(
      artboardName = artboardName,
      stateMachineName = stateMachineName,
      autoPlay = autoPlay ?: DefaultConfiguration.AUTOPLAY,
      autoBind = autoBind ?: DefaultConfiguration.AUTOBIND,
      fit = convertFit(fit) ?: DefaultConfiguration.fit,
      riveFile = riveFile,
    )
    view.configure(config, needsReload)
    needsReload = false
  }
  //endregion

  //region Internal State
  private var needsReload = false
  //endregion

  //region Helpers
  private fun executeOnUiThread(action: () -> Unit) {
    try {
      context.runOnUiQueueThread { action() }
    } catch (e: Exception) {
      throw Error(e.message) // TODO: Correctly handling errors (https://nitro.margelo.com/docs/errors)
    }
  }

  private fun convertFit(fit: Fit?): RiveFit? {
    if (fit == null) return null

    return when (fit) {
      Fit.FILL -> RiveFit.FILL
      Fit.CONTAIN -> RiveFit.CONTAIN
      Fit.COVER -> RiveFit.COVER
      Fit.FITWIDTH -> RiveFit.FIT_WIDTH
      Fit.FITHEIGHT -> RiveFit.FIT_HEIGHT
      Fit.NONE -> RiveFit.NONE
      Fit.SCALEDOWN -> RiveFit.SCALE_DOWN
      Fit.LAYOUT -> RiveFit.LAYOUT
    }
  }
  //endregion
}
