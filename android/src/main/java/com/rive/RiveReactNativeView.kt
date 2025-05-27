package com.rive

import android.annotation.SuppressLint
import android.widget.FrameLayout
import com.facebook.react.uimanager.ThemedReactContext
import app.rive.runtime.kotlin.RiveAnimationView
import app.rive.runtime.kotlin.controllers.RiveFileController
import app.rive.runtime.kotlin.core.Alignment
import app.rive.runtime.kotlin.core.File
import app.rive.runtime.kotlin.core.Fit
import app.rive.runtime.kotlin.core.RiveEvent
import app.rive.runtime.kotlin.core.RiveGeneralEvent
import app.rive.runtime.kotlin.core.RiveOpenURLEvent
import app.rive.runtime.kotlin.core.ViewModelInstance
import com.margelo.nitro.core.AnyMap
import com.margelo.nitro.rive.RiveEventType
import com.margelo.nitro.rive.RiveEvent as RNEvent

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
  private var eventListeners: MutableList<RiveFileController.RiveEventListener> = mutableListOf()

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

  fun play() = riveAnimationView?.play()

  fun pause() = riveAnimationView?.pause();

  fun addEventListener(onEvent: (event: RNEvent) -> Unit) {
    val eventListener = object : RiveFileController.RiveEventListener {
      override fun notifyEvent(event: RiveEvent) {
        val rnEvent = RNEvent(
          name = event.name,
          type = if (event is RiveOpenURLEvent) RiveEventType.OPENURL else RiveEventType.GENERAL,
          delay = event.delay.toDouble(),
          properties = convertEventProperties(event.properties),
          url = (event as? RiveOpenURLEvent)?.url,
          target = (event as? RiveOpenURLEvent)?.target
        )

        onEvent(rnEvent)
      }
    }
    riveAnimationView?.addEventListener(eventListener)
    eventListeners.add(eventListener)
  }

  fun removeEventListeners() {
    for (eventListener in eventListeners) {
      riveAnimationView?.removeEventListener(eventListener)
    }
    eventListeners.clear()
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
  private fun convertEventProperties(properties: Map<String, Any>?): AnyMap? {
    if (properties == null) return null

    val newMap = AnyMap()

    properties.forEach { (key, value) ->
      when (value) {
        is String -> newMap.setString(key, value)
        is Number -> newMap.setDouble(key, value.toDouble())
        is Boolean -> newMap.setBoolean(key, value)
      }
    }

    return newMap;
  }
  //endregion
}
