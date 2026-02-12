package com.rive

import android.annotation.SuppressLint
import android.widget.FrameLayout
import app.rive.Artboard
import app.rive.RiveFile
import app.rive.RiveView
import app.rive.ViewModelInstance
import app.rive.ViewModelInstanceSource
import app.rive.ViewModelSource
import com.facebook.react.uimanager.ThemedReactContext
import kotlinx.coroutines.CompletableDeferred

sealed class BindData {
  data object None : BindData()
  data object Auto : BindData()
  data class Instance(val instance: ViewModelInstance) : BindData()
  data class ByName(val name: String) : BindData()
}

data class ViewConfiguration(
  val artboardName: String?,
  val stateMachineName: String?,
  val autoPlay: Boolean,
  val riveFile: RiveFile,
  val alignment: app.rive.Alignment,
  val fit: app.rive.Fit,
  val layoutScaleFactor: Float?,
  val bindData: BindData
)

@SuppressLint("ViewConstructor")
class RiveReactNativeView(context: ThemedReactContext) : FrameLayout(context) {
  internal var riveView: RiveView? = null
  private val viewReadyDeferred = CompletableDeferred<Boolean>()
  private var boundInstance: ViewModelInstance? = null

  init {
    riveView = RiveView(context)
    addView(riveView)
  }

  suspend fun awaitViewReady(): Boolean {
    return viewReadyDeferred.await()
  }

  fun configure(config: ViewConfiguration, dataBindingChanged: Boolean, reload: Boolean = false, initialUpdate: Boolean = false) {
    if (reload) {
      val artboard = if (config.artboardName != null) {
        Artboard.fromFile(config.riveFile, config.artboardName)
      } else {
        Artboard.fromFile(config.riveFile)
      }
      riveView?.setRiveFile(config.riveFile, artboard, config.stateMachineName)
    }

    if (dataBindingChanged || initialUpdate) {
      applyDataBinding(config.bindData, config.riveFile)
    }

    viewReadyDeferred.complete(true)
  }

  fun bindViewModelInstance(vmi: ViewModelInstance) {
    boundInstance = vmi
  }

  fun getViewModelInstance(): ViewModelInstance? {
    return boundInstance
  }

  private fun applyDataBinding(bindData: BindData, riveFile: RiveFile) {
    when (bindData) {
      is BindData.None -> {
        boundInstance = null
      }
      is BindData.Auto -> {
        // Auto-binding handled by the Rive renderer
      }
      is BindData.Instance -> {
        boundInstance = bindData.instance
      }
      is BindData.ByName -> {
        // Create named instance from default view model
        try {
          val vmNames = kotlinx.coroutines.runBlocking { riveFile.getViewModelNames() }
          if (vmNames.isNotEmpty()) {
            val vmSource = ViewModelSource.Named(vmNames.first())
            val source = vmSource.namedInstance(bindData.name)
            boundInstance = ViewModelInstance.fromFile(riveFile, source)
          }
        } catch (e: Exception) {
          android.util.Log.e("RiveReactNativeView", "Failed to create named instance", e)
        }
      }
    }
  }

  fun play() { /* play handled by RiveView internally */ }

  fun pause() { /* pause handled by RiveView internally */ }

  fun reset() { /* reset handled by RiveView internally */ }

  fun playIfNeeded() { /* handled by RiveView internally */ }

  fun setNumberInputValue(name: String, value: Double, path: String?) {
    throw UnsupportedOperationException("SMI inputs not supported in experimental API")
  }

  fun getNumberInputValue(name: String, path: String?): Double {
    throw UnsupportedOperationException("SMI inputs not supported in experimental API")
  }

  fun setBooleanInputValue(name: String, value: Boolean, path: String?) {
    throw UnsupportedOperationException("SMI inputs not supported in experimental API")
  }

  fun getBooleanInputValue(name: String, path: String?): Boolean {
    throw UnsupportedOperationException("SMI inputs not supported in experimental API")
  }

  fun triggerInput(name: String, path: String?) {
    throw UnsupportedOperationException("SMI inputs not supported in experimental API")
  }

  fun setTextRunValue(name: String, value: String, path: String?) {
    throw UnsupportedOperationException("Text runs not supported in experimental API")
  }

  fun getTextRunValue(name: String, path: String?): String {
    throw UnsupportedOperationException("Text runs not supported in experimental API")
  }

  fun dispose() {
    boundInstance?.close()
    boundInstance = null
  }
}
