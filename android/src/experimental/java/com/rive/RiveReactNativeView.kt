package com.rive

import android.annotation.SuppressLint
import android.graphics.SurfaceTexture
import android.util.Log
import android.view.Choreographer
import android.view.MotionEvent
import android.view.TextureView
import android.widget.FrameLayout
import app.rive.Artboard
import app.rive.Fit
import app.rive.RiveFile
import app.rive.ViewModelInstance
import app.rive.ViewModelSource
import app.rive.core.ArtboardHandle
import app.rive.core.CommandQueue
import app.rive.core.RiveSurface
import app.rive.core.StateMachineHandle
import com.facebook.react.uimanager.ThemedReactContext
import com.margelo.nitro.rive.RiveErrorLogger
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.time.Duration
import kotlin.time.Duration.Companion.nanoseconds

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
  val riveWorker: CommandQueue,
  val alignment: app.rive.Alignment,
  val fit: app.rive.Fit,
  val layoutScaleFactor: Float?,
  val bindData: BindData
)

@SuppressLint("ViewConstructor")
class RiveReactNativeView(context: ThemedReactContext) : FrameLayout(context) {
  companion object {
    private const val TAG = "RiveReactNativeView"
  }

  var onError: ((String) -> Unit)? = null

  private val errorListener: (String) -> Unit = { msg ->
    onError?.invoke(msg)
  }

  private val viewReadyDeferred = CompletableDeferred<Boolean>()
  private var boundInstance: ViewModelInstance? = null
  private var riveWorker: CommandQueue? = null
  private var activeFit: Fit = Fit.Contain()

  private var riveFile: RiveFile? = null
  private var artboard: Artboard? = null
  private var artboardHandle: ArtboardHandle? = null
  private var stateMachineHandle: StateMachineHandle? = null
  private var riveSurface: RiveSurface? = null

  private var surfaceTexture: SurfaceTexture? = null
  private var surfaceWidth = 0
  private var surfaceHeight = 0

  private var renderLoopRunning = false
  private var lastFrameTimeNs = 0L
  private var frameCount = 0L

  private val textureView = TextureView(context).apply {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    surfaceTextureListener = object : TextureView.SurfaceTextureListener {
      override fun onSurfaceTextureAvailable(st: SurfaceTexture, w: Int, h: Int) {
        Log.d(TAG, "onSurfaceTextureAvailable: ${w}x${h} worker=${this@RiveReactNativeView.riveWorker != null}")
        this@RiveReactNativeView.surfaceTexture = st
        this@RiveReactNativeView.surfaceWidth = w
        this@RiveReactNativeView.surfaceHeight = h
        this@RiveReactNativeView.riveWorker?.let { worker ->
          this@RiveReactNativeView.riveSurface = worker.createRiveSurface(st)
          Log.d(TAG, "onSurfaceTextureAvailable: surface created")
          resizeArtboardIfLayout()
        }
      }

      override fun onSurfaceTextureDestroyed(st: SurfaceTexture): Boolean {
        this@RiveReactNativeView.riveSurface = null
        return false
      }

      override fun onSurfaceTextureSizeChanged(st: SurfaceTexture, w: Int, h: Int) {
        this@RiveReactNativeView.surfaceWidth = w
        this@RiveReactNativeView.surfaceHeight = h
        resizeArtboardIfLayout()
      }

      override fun onSurfaceTextureUpdated(st: SurfaceTexture) {}
    }
  }

  init {
    addView(textureView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

  private val renderCallback = object : Choreographer.FrameCallback {
    override fun doFrame(frameTimeNanos: Long) {
      if (!renderLoopRunning) return

      val deltaTime = if (lastFrameTimeNs == 0L) Duration.ZERO
        else (frameTimeNanos - lastFrameTimeNs).nanoseconds
      lastFrameTimeNs = frameTimeNanos

      val worker = riveWorker
      val art = artboardHandle
      val sm = stateMachineHandle
      val rs = riveSurface

      if (worker != null && art != null && sm != null && rs != null) {
        try {
          worker.advanceStateMachine(sm, deltaTime)
          worker.draw(art, sm, rs, activeFit)
          frameCount++
        } catch (e: Exception) {
          Log.e(TAG, "Render loop error", e)
        }
      }

      Choreographer.getInstance().postFrameCallback(this)
    }
  }

  private fun startRenderLoop() {
    if (renderLoopRunning) return
    renderLoopRunning = true
    lastFrameTimeNs = 0L
    Choreographer.getInstance().postFrameCallback(renderCallback)
  }

  private fun stopRenderLoop() {
    renderLoopRunning = false
    Choreographer.getInstance().removeFrameCallback(renderCallback)
  }

  suspend fun awaitViewReady(): Boolean {
    return viewReadyDeferred.await()
  }

  fun configure(config: ViewConfiguration, dataBindingChanged: Boolean, reload: Boolean = false, initialUpdate: Boolean = false) {
    riveWorker = config.riveWorker
    activeFit = config.fit
    Log.d(TAG, "configure: reload=$reload initialUpdate=$initialUpdate fit=$activeFit surfaceTexture=${surfaceTexture != null} surfaceW=${surfaceWidth} surfaceH=${surfaceHeight}")

    if (reload) {
      RiveErrorLogger.resetReportedErrors()
      RiveErrorLogger.addListener(errorListener)
      artboard?.close()

      val newArtboard = if (config.artboardName != null) {
        Artboard.fromFile(config.riveFile, config.artboardName)
      } else {
        Artboard.fromFile(config.riveFile)
      }
      artboard = newArtboard
      artboardHandle = newArtboard.artboardHandle

      riveFile = config.riveFile

      stateMachineHandle = if (config.stateMachineName != null) {
        config.riveWorker.createStateMachineByName(newArtboard.artboardHandle, config.stateMachineName)
      } else {
        config.riveWorker.createDefaultStateMachine(newArtboard.artboardHandle)
      }

      if (surfaceTexture != null && riveSurface == null) {
        riveSurface = config.riveWorker.createRiveSurface(surfaceTexture!!)
      }

      Log.d(TAG, "configure: artboard=${artboardHandle != null} sm=${stateMachineHandle != null} surface=${riveSurface != null}")

      startRenderLoop()
    }

    resizeArtboardIfLayout()

    if (dataBindingChanged || initialUpdate) {
      applyDataBinding(config.bindData, config.riveFile)
    }

    viewReadyDeferred.complete(true)
  }

  private fun resizeArtboardIfLayout() {
    val fit = activeFit
    if (fit is Fit.Layout) {
      val rs = riveSurface ?: return
      val art = artboard ?: return
      art.resizeArtboard(rs, fit.scaleFactor)
    }
  }

  override fun onInterceptTouchEvent(ev: MotionEvent?): Boolean = true

  @SuppressLint("ClickableViewAccessibility")
  override fun onTouchEvent(event: MotionEvent): Boolean {
    handlePointerEvent(event)
    return true
  }

  private fun handlePointerEvent(event: MotionEvent) {
    val worker = riveWorker ?: run { Log.w(TAG, "touch: no worker"); return }
    val smHandle = stateMachineHandle ?: run { Log.w(TAG, "touch: no smHandle"); return }
    val w = surfaceWidth.toFloat()
    val h = surfaceHeight.toFloat()
    if (w <= 0 || h <= 0) { Log.w(TAG, "touch: invalid surface ${w}x${h}"); return }

    val fit = activeFit

    try {
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          worker.pointerDown(smHandle, fit, w, h, event.getPointerId(event.actionIndex), event.x, event.y)
        }
        MotionEvent.ACTION_MOVE -> {
          worker.pointerMove(smHandle, fit, w, h, event.getPointerId(0), event.x, event.y)
        }
        MotionEvent.ACTION_UP -> {
          val id = event.getPointerId(event.actionIndex)
          worker.pointerUp(smHandle, fit, w, h, id, event.x, event.y)
          worker.pointerExit(smHandle, fit, w, h, id, event.x, event.y)
        }
        MotionEvent.ACTION_CANCEL -> {
          val id = event.getPointerId(event.actionIndex)
          worker.pointerUp(smHandle, fit, w, h, id, -1f, -1f)
          worker.pointerExit(smHandle, fit, w, h, id, -1f, -1f)
        }
      }
    } catch (e: Exception) {
      Log.e(TAG, "Pointer event failed", e)
    }
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
        CoroutineScope(Dispatchers.Default).launch {
          try {
            val vmNames = riveFile.getViewModelNames()
            if (vmNames.isEmpty()) return@launch
            withContext(Dispatchers.Main) {
              val art = artboard ?: return@withContext
              val source = ViewModelSource.DefaultForArtboard(art).defaultInstance()
              val instance = ViewModelInstance.fromFile(riveFile, source)
              boundInstance = instance
              bindInstanceToStateMachine(instance)
            }
          } catch (e: Exception) {
            Log.d(TAG, "Auto-binding skipped: ${e.message}")
          }
        }
      }
      is BindData.Instance -> {
        boundInstance = bindData.instance
        bindInstanceToStateMachine(bindData.instance)
      }
      is BindData.ByName -> {
        try {
          val vmNames = kotlinx.coroutines.runBlocking { riveFile.getViewModelNames() }
          if (vmNames.isNotEmpty()) {
            val vmSource = ViewModelSource.Named(vmNames.first())
            val source = vmSource.namedInstance(bindData.name)
            val instance = ViewModelInstance.fromFile(riveFile, source)
            boundInstance = instance
            bindInstanceToStateMachine(instance)
          }
        } catch (e: Exception) {
          Log.e(TAG, "Failed to create named instance", e)
        }
      }
    }
  }

  private fun bindInstanceToStateMachine(instance: ViewModelInstance) {
    val worker = riveWorker
    val smHandle = stateMachineHandle
    if (worker != null && smHandle != null) {
      worker.bindViewModelInstance(smHandle, instance.instanceHandle)
    } else {
      Log.w(TAG, "Cannot bind VMI: worker or state machine handle not available")
    }
  }

  fun play() { /* controlled by render loop */ }

  fun pause() { /* controlled by render loop */ }

  fun reset() { /* controlled by render loop */ }

  fun playIfNeeded() { /* controlled by render loop */ }

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
    RiveErrorLogger.removeListener(errorListener)
    stopRenderLoop()
    boundInstance?.close()
    boundInstance = null
    artboard?.close()
    artboard = null
    riveSurface?.close()
    riveSurface = null
  }
}
