package com.rive

import android.annotation.SuppressLint
import android.widget.FrameLayout
import com.facebook.react.uimanager.ThemedReactContext
import app.rive.runtime.kotlin.RiveAnimationView
import app.rive.runtime.kotlin.core.Alignment
import app.rive.runtime.kotlin.core.File
import app.rive.runtime.kotlin.core.Fit
import app.rive.runtime.kotlin.core.ViewModelInstance

data class ViewConfiguration(
  val artboardName: String?,
  val stateMachineName: String?,
  val autoBind: Boolean,
  val autoPlay: Boolean,
  val riveFile: File,
  val alignment: Alignment,
  val fit: Fit
)

@SuppressLint("ViewConstructor")
class RiveReactNativeView(context: ThemedReactContext) : FrameLayout(context) {
  private var riveAnimationView: RiveAnimationView? = null

  init {
    riveAnimationView = RiveAnimationView(context)
    addView(riveAnimationView)
  }

  //region Public Methods (API)
  fun bindViewModelInstance(vmi: ViewModelInstance) {
    val stateMachines = riveAnimationView?.controller?.stateMachines
    if (!stateMachines.isNullOrEmpty()) {
      stateMachines.first().viewModelInstance = vmi
    }
  }

  fun play() {
    riveAnimationView?.play();
  }

  fun pause() {
    riveAnimationView?.pause();
  }

  fun configure(config: ViewConfiguration, reload: Boolean = false) {
    if (reload) {
      riveAnimationView?.setRiveFile(
        config.riveFile,
        artboardName = config.artboardName,
        stateMachineName = config.stateMachineName,
        autoplay = config.autoPlay,
        autoBind = config.autoBind,
        fit = config.fit
      )
    } else {
      riveAnimationView?.alignment = config.alignment
      riveAnimationView?.fit = config.fit
    }

  }
  //endregion

  //region Internal

  //endregion
}
