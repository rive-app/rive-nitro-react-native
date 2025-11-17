package com.margelo.nitro.rive

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.uimanager.ThemedReactContext
import com.margelo.nitro.core.Promise
import com.rive.RiveReactNativeView
import com.rive.ViewConfiguration
import app.rive.runtime.kotlin.core.Fit as RiveFit
import app.rive.runtime.kotlin.core.Alignment as RiveAlignment
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object DefaultConfiguration {
  const val AUTOPLAY = true
  val FIT = RiveFit.CONTAIN
  val ALIGNMENT = RiveAlignment.CENTER
  val LAYOUTSCALEFACTOR = null
}

@Keep
@DoNotStrip
class HybridRiveView(val context: ThemedReactContext) : HybridRiveViewSpec() {
  //region State
  override val view: RiveReactNativeView = RiveReactNativeView(context)
  private var needsReload = false
  private var registeredFile: HybridRiveFile? = null
  //endregion

  //region View Props
  override var artboardName: String? = null
    set(value) {
      changed(field, value) { field = it }
    }
  override var stateMachineName: String? = null
    set(value) {
      changed(field, value) { field = it }
    }
  override var autoPlay: Boolean? = null
    set(value) {
      changed(field, value) { field = it }
    }
  override var file: HybridRiveFileSpec = HybridRiveFile()
    set(value) {
      if (field != value) {
        registeredFile?.unregisterView(this)
        registeredFile = null
      }
      changed(field, value) { field = it }
    }
  override var alignment: Alignment? = null
  override var fit: Fit? = null
  override var layoutScaleFactor: Double? = null
  override var dataBind: Variant_HybridViewModelInstanceSpec_DataBindMode_DataBindByName =
    Variant_HybridViewModelInstanceSpec_DataBindMode_DataBindByName.Second(DataBindMode.NONE)
  //endregion

  //region View Methods
  override fun awaitViewReady(): Promise<Boolean> {
    return Promise.async {
      withContext(Dispatchers.Main) {
        view.awaitViewReady()
      }
    }
  }

  override fun bindViewModelInstance(viewModelInstance: HybridViewModelInstanceSpec) =
    executeOnUiThread {
      val hybridVmi = viewModelInstance as? HybridViewModelInstance ?: return@executeOnUiThread;
      view.bindViewModelInstance(hybridVmi.viewModelInstance)
    }

  override fun getViewModelInstance(): HybridViewModelInstanceSpec? {
    val viewModelInstance = view.getViewModelInstance() ?: return null
    return HybridViewModelInstance(viewModelInstance)
  }

  override fun play() = executeOnUiThread { view.play() }

  override fun pause() = executeOnUiThread { view.pause() }

  override fun onEventListener(onEvent: (event: UnifiedRiveEvent) -> Unit) =
    executeOnUiThread { view.addEventListener(onEvent) }

  override fun removeEventListeners() = executeOnUiThread { view.removeEventListeners() }

  override fun setNumberInputValue(name: String, value: Double, path: String?) =
    view.setNumberInputValue(name, value, path)

  override fun getNumberInputValue(name: String, path: String?): Double =
    view.getNumberInputValue(name, path)

  override fun setBooleanInputValue(name: String, value: Boolean, path: String?) =
    view.setBooleanInputValue(name, value, path)

  override fun getBooleanInputValue(name: String, path: String?): Boolean =
    view.getBooleanInputValue(name, path)

  override fun triggerInput(name: String, path: String?) = view.triggerInput(name, path)

  override fun setTextRunValue(name: String, value: String, path: String?) =
    view.setTextRunValue(name, value, path)

  override fun getTextRunValue(name: String, path: String?): String =
    view.getTextRunValue(name, path)
  //endregion

  //region Update
  fun refreshAfterAssetChange() {
    afterUpdate()
  }

  override fun afterUpdate() {
    val hybridFile = file as? HybridRiveFile
    val riveFile = hybridFile?.riveFile ?: return

    val (bindMode, bindInstance, bindInstanceName) = when (dataBind) {
      is Variant_HybridViewModelInstanceSpec_DataBindMode_DataBindByName.First -> {
        val instance = (dataBind.asFirstOrNull() as? HybridViewModelInstance)?.viewModelInstance
        Triple(com.rive.BindData.INSTANCE, instance, null)
      }
      is Variant_HybridViewModelInstanceSpec_DataBindMode_DataBindByName.Second -> {
        when (dataBind.asSecondOrNull()) {
          DataBindMode.AUTO -> Triple(com.rive.BindData.AUTO, null, null)
          DataBindMode.NONE -> Triple(com.rive.BindData.NONE, null, null)
          else -> Triple(com.rive.BindData.NONE, null, null)
        }
      }
      is Variant_HybridViewModelInstanceSpec_DataBindMode_DataBindByName.Third -> {
        val name = dataBind.asThirdOrNull()?.byName
        Triple(com.rive.BindData.BY_NAME, null, name)
      }
    }

    val config = ViewConfiguration(
      artboardName = artboardName,
      stateMachineName = stateMachineName,
      autoPlay = autoPlay ?: DefaultConfiguration.AUTOPLAY,
      riveFile = riveFile,
      alignment = convertAlignment(alignment) ?: DefaultConfiguration.ALIGNMENT,
      fit = convertFit(fit) ?: DefaultConfiguration.FIT,
      layoutScaleFactor = layoutScaleFactor?.toFloat() ?: DefaultConfiguration.LAYOUTSCALEFACTOR,
      bindMode = bindMode,
      bindInstance = bindInstance,
      bindInstanceName = bindInstanceName
    )
    view.configure(config, needsReload)

    if (needsReload && hybridFile != null) {
      hybridFile.registerView(this)
      registeredFile = hybridFile
    }

    needsReload = false
    super.afterUpdate()
  }
  //endregion

  //region Helpers
  private fun <T> changed(current: T, new: T, setter: (T) -> Unit) {
    if (current != new) {
      setter(new)
      needsReload = true
    }
  }

  private fun executeOnUiThread(action: () -> Unit) {
    context.currentActivity?.runOnUiThread() {
      try {
        action()
      } catch (e: Exception) {
        throw Error(e.message) // TODO: Correctly handling errors (https://nitro.margelo.com/docs/errors)
      } catch (e: Error) {
        throw Error(e.message)
      }
    }
  }

  private fun convertAlignment(alignment: Alignment?): RiveAlignment? {
    if (alignment == null) return null

    return when (alignment) {
      Alignment.TOPLEFT -> RiveAlignment.TOP_LEFT
      Alignment.TOPCENTER -> RiveAlignment.TOP_CENTER
      Alignment.TOPRIGHT -> RiveAlignment.TOP_RIGHT
      Alignment.CENTERLEFT -> RiveAlignment.CENTER_LEFT
      Alignment.CENTER -> RiveAlignment.CENTER
      Alignment.CENTERRIGHT -> RiveAlignment.CENTER_RIGHT
      Alignment.BOTTOMLEFT -> RiveAlignment.BOTTOM_LEFT
      Alignment.BOTTOMCENTER -> RiveAlignment.BOTTOM_CENTER
      Alignment.BOTTOMRIGHT -> RiveAlignment.BOTTOM_RIGHT
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
