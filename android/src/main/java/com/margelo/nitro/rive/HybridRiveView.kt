package com.margelo.nitro.rive

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.uimanager.ThemedReactContext
import com.margelo.nitro.core.Promise
import com.rive.BindData
import com.rive.RiveReactNativeView
import com.rive.ViewConfiguration
import app.rive.runtime.kotlin.core.Fit as RiveFit
import app.rive.runtime.kotlin.core.Alignment as RiveAlignment
import app.rive.runtime.kotlin.core.errors.*
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
  val FIT = RiveFit.CONTAIN
  val ALIGNMENT = RiveAlignment.CENTER
  val LAYOUTSCALEFACTOR = null
}

@Keep
@DoNotStrip
class HybridRiveView(val context: ThemedReactContext) : HybridRiveViewSpec() {
  companion object {
    private const val TAG = "HybridRiveView"
  }

  //region State
  override val view: RiveReactNativeView = RiveReactNativeView(context)
  private var needsReload = false
  private var dataBindingChanged = false
  private var initialUpdate = true
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
  override var dataBind: Variant_HybridViewModelInstanceSpec_DataBindMode_DataBindByName? = null
    set(value) {
      if (field != value) {
        field = value
        dataBindingChanged = true
      }
    }
  override var onError: (error: RiveError) -> Unit = {}
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
      view.configure(config, dataBindingChanged=dataBindingChanged, needsReload, initialUpdate= initialUpdate)

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

  private fun detectErrorType(exception: Exception): Pair<RiveErrorType, String> {
    val message = exception.message ?: exception.toString()
    val type = when (exception) {
      is ArtboardException -> RiveErrorType.INCORRECTARTBOARDNAME
      is StateMachineException -> RiveErrorType.INCORRECTSTATEMACHINENAME
      is AnimationException -> RiveErrorType.UNKNOWN
      is MalformedFileException -> RiveErrorType.MALFORMEDFILE
      is StateMachineInputException -> RiveErrorType.INCORRECTSTATEMACHINEINPUTNAME
      is TextValueRunException -> RiveErrorType.UNKNOWN
      is ViewModelException -> RiveErrorType.VIEWMODELINSTANCENOTFOUND
      else -> RiveErrorType.UNKNOWN
    }
    return Pair(type, message)
  }

  fun logged(tag: String, note: String? = null, fn: () -> Unit) {
    try {
      fn()
    } catch (e: Exception) {
      val (errorType, errorDescription) = detectErrorType(e)
      val noteString = note?.let { " $it" } ?: ""
      val errorMessage = "[RIVE] $tag$noteString $errorDescription"
      val riveError = RiveError(
        type = errorType,
        message = errorMessage
      )
      onError(riveError)
    }
  }
  //endregion
}
