package com.margelo.nitro.rive

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.uimanager.ThemedReactContext
import com.margelo.nitro.core.Promise
import com.rive.BindData
import com.rive.RiveReactNativeView
import com.rive.ViewConfiguration
import app.rive.Fit as RiveFit
import app.rive.Alignment as RiveAlignment
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

fun Variant_HybridViewModelInstanceSpec_DataBindMode_DataBindByName?.toBindData(): BindData {
  if (this == null) return BindData.Auto

  return when (this) {
    is Variant_HybridViewModelInstanceSpec_DataBindMode_DataBindByName.First -> {
      val instance = (this.asFirstOrNull() as? HybridViewModelInstance)?.viewModelInstance
        ?: throw Error("Invalid ViewModelInstance")
      BindData.Instance(instance)
    }
    is Variant_HybridViewModelInstanceSpec_DataBindMode_DataBindByName.Second -> {
      when (this.asSecondOrNull()) {
        DataBindMode.AUTO -> BindData.Auto
        DataBindMode.NONE -> BindData.None
        else -> BindData.None
      }
    }
    is Variant_HybridViewModelInstanceSpec_DataBindMode_DataBindByName.Third -> {
      val name = this.asThirdOrNull()?.byName ?: throw Error("Missing byName value")
      BindData.ByName(name)
    }
  }
}

object DefaultConfiguration {
  const val AUTOPLAY = true
  val FIT = RiveFit.Contain()
  val ALIGNMENT = RiveAlignment.Center
  val LAYOUTSCALEFACTOR = null
}

@Keep
@DoNotStrip
class HybridRiveView(val context: ThemedReactContext) : HybridRiveViewSpec() {
  companion object {
    private const val TAG = "HybridRiveView"
  }

  override val view: RiveReactNativeView = RiveReactNativeView(context)
  private var needsReload = false
  private var dataBindingChanged = false
  private var initialUpdate = true
  private var registeredFile: HybridRiveFile? = null

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
  override var file: HybridRiveFileSpec = HybridRiveFile(null, HybridRiveFileFactory.getSharedWorker())
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
  override var dataBind: Variant_HybridViewModelInstanceSpec_DataBindMode_DataBindByName? = null
    set(value) {
      if (field != value) {
        field = value
        dataBindingChanged = true
      }
    }
  override var onError: (error: RiveError) -> Unit = {}

  override fun awaitViewReady(): Promise<Boolean> {
    return Promise.async {
      withContext(Dispatchers.Main) {
        view.awaitViewReady()
      }
    }
  }

  override fun bindViewModelInstance(viewModelInstance: HybridViewModelInstanceSpec) =
    executeOnUiThread {
      val hybridVmi = viewModelInstance as? HybridViewModelInstance ?: return@executeOnUiThread
      view.bindViewModelInstance(hybridVmi.viewModelInstance)
    }

  override fun getViewModelInstance(): HybridViewModelInstanceSpec? {
    val vmi = view.getViewModelInstance() ?: return null
    val hybridFile = file as? HybridRiveFile ?: return null
    return HybridViewModelInstance(vmi, hybridFile.riveWorker, hybridFile)
  }

  override fun play() = asyncExecuteOnUiThread { view.play() }
  override fun pause() = asyncExecuteOnUiThread { view.pause() }
  override fun reset() = asyncExecuteOnUiThread { view.reset() }
  override fun playIfNeeded() = view.playIfNeeded()

  override fun onEventListener(onEvent: (event: UnifiedRiveEvent) -> Unit) {
    throw UnsupportedOperationException("Events are not supported in the experimental Android API")
  }

  override fun removeEventListeners() {
    throw UnsupportedOperationException("Events are not supported in the experimental Android API")
  }

  override fun setNumberInputValue(name: String, value: Double, path: String?) {
    throw UnsupportedOperationException("SMI inputs not supported in experimental API")
  }

  override fun getNumberInputValue(name: String, path: String?): Double {
    throw UnsupportedOperationException("SMI inputs not supported in experimental API")
  }

  override fun setBooleanInputValue(name: String, value: Boolean, path: String?) {
    throw UnsupportedOperationException("SMI inputs not supported in experimental API")
  }

  override fun getBooleanInputValue(name: String, path: String?): Boolean {
    throw UnsupportedOperationException("SMI inputs not supported in experimental API")
  }

  override fun triggerInput(name: String, path: String?) {
    throw UnsupportedOperationException("SMI inputs not supported in experimental API")
  }

  override fun setTextRunValue(name: String, value: String, path: String?) {
    throw UnsupportedOperationException("Text runs not supported in experimental API")
  }

  override fun getTextRunValue(name: String, path: String?): String {
    throw UnsupportedOperationException("Text runs not supported in experimental API")
  }

  fun refreshAfterAssetChange() {
    afterUpdate()
  }

  override fun afterUpdate() {
    logged(TAG, "afterUpdate") {
      val hybridFile = file as? HybridRiveFile
      val riveFile = hybridFile?.riveFile ?: return@logged

      val config = ViewConfiguration(
        artboardName = artboardName,
        stateMachineName = stateMachineName,
        autoPlay = autoPlay ?: DefaultConfiguration.AUTOPLAY,
        riveFile = riveFile,
        alignment = convertAlignment(alignment) ?: DefaultConfiguration.ALIGNMENT,
        fit = convertFit(fit) ?: DefaultConfiguration.FIT,
        layoutScaleFactor = layoutScaleFactor?.toFloat() ?: DefaultConfiguration.LAYOUTSCALEFACTOR,
        bindData = dataBind.toBindData()
      )
      view.configure(config, dataBindingChanged = dataBindingChanged, needsReload, initialUpdate = initialUpdate)

      if (needsReload && hybridFile != null) {
        hybridFile.registerView(this)
        registeredFile = hybridFile
      }

      needsReload = false
      dataBindingChanged = false
      initialUpdate = false
      super.afterUpdate()
    }
  }

  private fun <T> changed(current: T, new: T, setter: (T) -> Unit) {
    if (current != new) {
      setter(new)
      needsReload = true
    }
  }

  private fun asyncExecuteOnUiThread(action: () -> Unit): Promise<Unit> {
    return Promise.async {
      context.currentActivity?.runOnUiThread {
        try {
          action()
        } catch (e: Exception) {
          throw Error(e.message)
        }
      }
    }
  }

  private fun executeOnUiThread(action: () -> Unit) {
    context.currentActivity?.runOnUiThread {
      try {
        action()
      } catch (e: Exception) {
        throw Error(e.message)
      }
    }
  }

  private fun convertAlignment(alignment: Alignment?): RiveAlignment? {
    if (alignment == null) return null
    return when (alignment) {
      Alignment.TOPLEFT -> RiveAlignment.TopLeft
      Alignment.TOPCENTER -> RiveAlignment.TopCenter
      Alignment.TOPRIGHT -> RiveAlignment.TopRight
      Alignment.CENTERLEFT -> RiveAlignment.CenterLeft
      Alignment.CENTER -> RiveAlignment.Center
      Alignment.CENTERRIGHT -> RiveAlignment.CenterRight
      Alignment.BOTTOMLEFT -> RiveAlignment.BottomLeft
      Alignment.BOTTOMCENTER -> RiveAlignment.BottomCenter
      Alignment.BOTTOMRIGHT -> RiveAlignment.BottomRight
    }
  }

  private fun convertFit(fit: Fit?): RiveFit? {
    if (fit == null) return null
    return when (fit) {
      Fit.FILL -> RiveFit.Fill
      Fit.CONTAIN -> RiveFit.Contain()
      Fit.COVER -> RiveFit.Cover()
      Fit.FITWIDTH -> RiveFit.FitWidth()
      Fit.FITHEIGHT -> RiveFit.FitHeight()
      Fit.NONE -> RiveFit.None()
      Fit.SCALEDOWN -> RiveFit.ScaleDown()
      Fit.LAYOUT -> RiveFit.Layout()
    }
  }

  fun logged(tag: String, note: String? = null, fn: () -> Unit) {
    try {
      fn()
    } catch (e: Exception) {
      val message = e.message ?: e.toString()
      val noteString = note?.let { " $it" } ?: ""
      val errorMessage = "[RIVE] $tag$noteString $message"
      val riveError = RiveError(
        type = RiveErrorType.UNKNOWN,
        message = errorMessage
      )
      onError(riveError)
    }
  }
}
