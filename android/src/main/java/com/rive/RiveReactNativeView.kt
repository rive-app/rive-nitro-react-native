package com.rive

import android.annotation.SuppressLint
import android.widget.FrameLayout
import androidx.lifecycle.LifecycleObserver
import androidx.lifecycle.LifecycleOwner
import app.rive.runtime.kotlin.RiveAnimationView
import app.rive.runtime.kotlin.RiveViewLifecycleObserver
import app.rive.runtime.kotlin.controllers.RiveFileController
import app.rive.runtime.kotlin.core.RefCount
import com.facebook.react.uimanager.ThemedReactContext
import app.rive.runtime.kotlin.core.Alignment
import app.rive.runtime.kotlin.core.File
import app.rive.runtime.kotlin.core.Fit
import app.rive.runtime.kotlin.core.RiveEvent
import app.rive.runtime.kotlin.core.RiveOpenURLEvent
import app.rive.runtime.kotlin.core.SMIBoolean
import app.rive.runtime.kotlin.core.SMIInput
import app.rive.runtime.kotlin.core.SMINumber
import app.rive.runtime.kotlin.core.SMITrigger
import app.rive.runtime.kotlin.core.ViewModelInstance
import app.rive.runtime.kotlin.core.errors.ViewModelException
import com.margelo.nitro.rive.EventPropertiesOutput
import com.margelo.nitro.rive.EventPropertiesOutputExtensions as EPO
import com.margelo.nitro.rive.RiveEventType
import com.margelo.nitro.rive.UnifiedRiveEvent as RNEvent
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
  val riveFile: File,
  val alignment: Alignment,
  val fit: Fit,
  val layoutScaleFactor: Float?,
  val bindData: BindData
)

class ReactNativeRiveViewLifecycleObserver(dependencies: MutableList<RefCount>) :
  RiveViewLifecycleObserver(dependencies) {
  @SuppressLint("MissingSuperCall")
  override fun onDestroy(owner: LifecycleOwner) {
    owner.lifecycle.removeObserver(this)
  }

  fun dispose() {
    dependencies.forEach { it.release() }
    dependencies.clear()
  }
}

@SuppressLint("ViewConstructor")
class ReactNativeRiveAnimationView(context: ThemedReactContext) : RiveAnimationView(context) {
  fun dispose() {
    (lifecycleObserver as ReactNativeRiveViewLifecycleObserver).dispose()
  }

  @SuppressLint("VisibleForTests")
  override fun createObserver(): LifecycleObserver {
    return ReactNativeRiveViewLifecycleObserver(
      listOfNotNull(controller, rendererAttributes.assetLoader).toMutableList()
    )
  }
}

@SuppressLint("ViewConstructor")
class RiveReactNativeView(context: ThemedReactContext) : FrameLayout(context) {
  internal var riveAnimationView: ReactNativeRiveAnimationView? = null
  private var eventListeners: MutableList<RiveFileController.RiveEventListener> = mutableListOf()
  private val viewReadyDeferred = CompletableDeferred<Boolean>()
  private var _activeStateMachineName: String? = null
  private var willDispose = false

  init {
    riveAnimationView = ReactNativeRiveAnimationView(context)
    addView(riveAnimationView)
  }

  fun dispose() {
    willDispose = true
  }

  override fun onDetachedFromWindow() {
    if (willDispose) {
      riveAnimationView?.dispose()
      removeEventListeners()
    }
    super.onDetachedFromWindow()
  }

  //region Public Methods (API)
  suspend fun awaitViewReady(): Boolean {
    return viewReadyDeferred.await()
  }

  fun configure(config: ViewConfiguration, dataBindingChanged: Boolean, reload: Boolean = false, initialUpdate: Boolean = false) {
    if (reload) {
      riveAnimationView?.setRiveFile(
        config.riveFile,
        artboardName = config.artboardName,
        stateMachineName = config.stateMachineName,
        autoplay = config.autoPlay,
        alignment = config.alignment,
        fit = config.fit
      )
      _activeStateMachineName = getSafeStateMachineName()
    } else {
      riveAnimationView?.alignment = config.alignment
      riveAnimationView?.fit = config.fit
      // TODO: this seems to require a reload for the view to take the new value (bug on Android)
      riveAnimationView?.layoutScaleFactor = config.layoutScaleFactor
    }

    if (dataBindingChanged || initialUpdate) {
      applyDataBinding(config.bindData)
    }

    viewReadyDeferred.complete(true)
  }

  fun bindViewModelInstance(vmi: ViewModelInstance) {
    val stateMachines = riveAnimationView?.controller?.stateMachines
    if (!stateMachines.isNullOrEmpty()) {
      stateMachines.first().viewModelInstance = vmi
    }
  }

  fun getViewModelInstance(): ViewModelInstance? {
    val stateMachines = riveAnimationView?.controller?.stateMachines
    return if (!stateMachines.isNullOrEmpty()) {
      stateMachines.first().viewModelInstance
    } else {
      null
    }
  }

  fun applyDataBinding(bindData: BindData) {
    val stateMachines = riveAnimationView?.controller?.stateMachines
    if (stateMachines.isNullOrEmpty()) return

    val stateMachine = stateMachines.first()

    when (bindData) {
      is BindData.None -> {
        stateMachine.viewModelInstance = null
      }
      is BindData.Auto -> {
        val artboard = riveAnimationView?.controller?.activeArtboard
        val file = riveAnimationView?.controller?.file
        if (artboard != null && file != null) {
          try {
            file.defaultViewModelForArtboard(artboard)
          } catch (e: ViewModelException) {
            null
          }?.let {
            val instance = it.createDefaultInstance()
            stateMachine.viewModelInstance = instance
          }
        }
      }
      is BindData.Instance -> {
        stateMachine.viewModelInstance = bindData.instance
      }
      is BindData.ByName -> {
        val artboard = riveAnimationView?.controller?.activeArtboard
        val file = riveAnimationView?.controller?.file
        if (artboard != null && file != null) {
          val viewModel = file.defaultViewModelForArtboard(artboard)
          val instance = viewModel.createInstanceFromName(bindData.name)
          stateMachine.viewModelInstance = instance
        }
      }
    }

    stateMachine.name.let { smName ->
      riveAnimationView?.play(smName, isStateMachine = true)
    }
  }

  fun play() = riveAnimationView?.play()

  fun pause() = riveAnimationView?.pause()

  fun reset() = riveAnimationView?.reset()

  fun playIfNeeded() {
    if (riveAnimationView?.isPlaying == false) {
      riveAnimationView?.post {
        riveAnimationView?.play()
      }
    }
  }

  fun addEventListener(onEvent: (event: RNEvent) -> Unit) {
    val eventListener = object : RiveFileController.RiveEventListener {
      override fun notifyEvent(event: RiveEvent) {
        // TODO: Handle general events better (in case of audio events)
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

  fun setNumberInputValue(name: String, value: Double, path: String?) {
    handleInput(
      name = name,
      path = path,
      type = InputType.Number,
      onSuccess = { _ ->
        // Use Rive Android's queue system to actually set the input
        riveAnimationView?.controller?.setNumberState(
          stateMachineName = activeStateMachineName,
          inputName = name,
          value = value.toFloat(),
          path = path
        )
        value
      }
    )
  }

  fun getNumberInputValue(name: String, path: String?): Double {
    return handleInput(
      name = name,
      path = path,
      type = InputType.Number,
      onSuccess = { smi -> (smi as SMINumber).value.toDouble() }
    )
  }

  fun setBooleanInputValue(name: String, value: Boolean, path: String?) {
    handleInput(
      name = name,
      path = path,
      type = InputType.BooleanInput,
      onSuccess = { _ ->
        // Use Rive Android's queue system to actually set the input
        riveAnimationView?.controller?.setBooleanState(
          stateMachineName = activeStateMachineName,
          inputName = name,
          value = value,
          path = path
        )
        value
      }
    )
  }

  fun getBooleanInputValue(name: String, path: String?): Boolean {
    return handleInput(
      name = name,
      path = path,
      type = InputType.BooleanInput,
      onSuccess = { smi -> (smi as SMIBoolean).value }
    )
  }

  fun triggerInput(name: String, path: String?) {
    handleInput(
      name = name,
      path = path,
      type = InputType.Trigger,
      onSuccess = {
        riveAnimationView?.controller?.fireState(
          stateMachineName = activeStateMachineName,
          inputName = name,
          path = path
        )
      }
    )
  }

  fun setTextRunValue(name: String, value: String, path: String?) {
    try {
      if (path == null) {
        riveAnimationView?.setTextRunValue(name, value)
      } else {
        riveAnimationView?.setTextRunValue(name, value, path)
      }
    } catch (e: Exception) {
      throw Error(e.message)
    }
  }

  fun getTextRunValue(name: String, path: String?): String {
    val value = if (path == null) {
      riveAnimationView?.getTextRunValue(name)
    } else {
      riveAnimationView?.getTextRunValue(name, path)
    }

    if (value == null) {
      throw Error("Could not find text run value (name: $name, path: $path)")
    }

    return value
  }
  //endregion

  //region Internal

  private fun convertEventProperties(properties: Map<String, Any>?): Map<String, EventPropertiesOutput>? {
    if (properties == null) return null

    val newMap = HashMap<String, EventPropertiesOutput>()

    properties.forEach { (key, value) ->
      when (value) {
        is String -> newMap.set(key, EPO.string(value))
        is Number -> newMap.set(key, EPO.number(value.toDouble()))
        is Boolean -> newMap.set(key, EPO.boolean(value))
      }
    }

    return newMap
  }

  /**
   * Gets the SMI input from the Rive file.
   * @param name The name of the input.
   * @param path The path of the input.
   * @return The SMI input.
   * @throws Error if the input is not found.
   */
  private fun getSMIInput(name: String, path: String?): SMIInput {
    try {
      val smi = if (path == null) {
        val stateMachine = riveAnimationView?.controller?.stateMachines?.get(0)
        stateMachine?.input(name)
      } else {
        val artboard = riveAnimationView?.controller?.activeArtboard
        artboard?.input(name, path)
      }
      if (smi == null) throw Exception("Could not find input (name: $name, path: $path)")
      return smi
    } catch (e: Exception) {
      throw Error(e.message)
    }
  }

  // TODO: this is throwing when autoplay is false
  // TODO: This is a temporary solution to get the state machine name as Android supports
  // playing multiple state machines, but in React Native we only allow playing one.
  /**
   * Gets the name of the active state machine.
   * @throws Error if the state machine name could not be found
   * @return The name of the state machine that "is playing" / "will be played"
   */
  private fun getSafeStateMachineName(): String {
    try {
      val stateMachines = riveAnimationView?.controller?.stateMachines
      if (stateMachines.isNullOrEmpty()) {
        throw Exception("No state machines found in the Rive file")
      }
      return stateMachines.first().name
    } catch (e: Exception) {
      throw Error(e.message)
    }
  }

  /**
   * The name of the active state machine.
   * @throws Error if the state machine name could not be found
   * @return The name of the state machine that "is playing" / "will be played"
   */
  private val activeStateMachineName: String
    get() = _activeStateMachineName
      ?: throw Error("View not configured. Could not find active state machine name")

  /**
   * The type of the state machine input.
   * @param T The type of the state machine input.
   */
  private sealed class InputType<T> {
    data object Number : InputType<Double>()
    data object BooleanInput : InputType<Boolean>()
    data object Trigger : InputType<Unit>()
  }

  /**
   * Handles the state machine input.
   * @param name The name of the input.
   * @param path The path of the input.
   * @param type The type of the input.
   * @param onSuccess The function to call when the input is successfully handled.
   * @return The value of the input.
   */
  private inline fun <T> handleInput(
    name: String,
    path: String?,
    type: InputType<T>,
    onSuccess: (SMIInput) -> T
  ): T {
    val smi = getSMIInput(name, path)
    when (type) {
      is InputType.Number -> if (smi !is SMINumber) throw Error("State machine input is not a number")
      is InputType.BooleanInput -> if (smi !is SMIBoolean) throw Error("State machine input is not a boolean")
      is InputType.Trigger -> if (smi !is SMITrigger) throw Error("State machine input is not a trigger")
    }

    try {
      return onSuccess(smi)
    } catch (e: Exception) {
      throw Error("Could not handle ${type::class.simpleName?.lowercase()} state machine input")
    }
  }
  //endregion
}
