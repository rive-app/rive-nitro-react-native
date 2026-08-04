package com.rive

import android.annotation.SuppressLint
import android.graphics.Rect
import android.graphics.SurfaceTexture
import android.os.Build
import android.util.Log
import android.view.Choreographer
import android.view.MotionEvent
import android.view.TextureView
import android.view.View
import android.widget.FrameLayout
import com.facebook.react.bridge.UiThreadUtil
import app.rive.Artboard
import app.rive.Fit
import app.rive.RiveFile
import app.rive.ViewModelInstance
import app.rive.ViewModelSource
import app.rive.core.ArtboardHandle
import app.rive.core.CommandQueue
import app.rive.core.RiveSurface
import app.rive.core.StateMachineHandle
import app.rive.core.SurfaceTextureSurface
import com.facebook.react.uimanager.ThemedReactContext
import com.margelo.nitro.rive.OffscreenBehavior
import com.margelo.nitro.rive.RiveErrorLogger
import com.margelo.nitro.rive.RiveLog
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.time.Duration
import kotlin.time.Duration.Companion.nanoseconds

// The renderEnabled prop (boolean | 'pause') resolved into what the render
// loop should do: draw normally, keep advancing but skip draws, or stop both.
enum class RenderMode { Enabled, SkipDraws, Paused }

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

    // Half of a 120Hz vsync: lets a cap land on the nearest vsync multiple
    // (e.g. every 4th frame at 120Hz for a 30fps cap) instead of drifting past
    // it and halving the effective rate.
    private const val CAP_TOLERANCE_NS = 4_000_000L
  }

  // Render at most this many frames per second; null = every vsync.
  var frameRate: Double? = null
    set(value) {
      field = value
      updateFrameRateHint()
    }

  // What to do while the view is outside the visible viewport (scrolled out,
  // hidden, or windowless): keep running, skip draws only, or pause fully.
  // Never automatic — data-binding consumers may rely on the state machine
  // advancing while offscreen. Overlays in the same window (e.g. RN Modal)
  // don't count as covering the view.
  var offscreenBehavior: OffscreenBehavior = OffscreenBehavior.NONE

  // Manual counterpart to offscreenBehavior for occlusion the view can't
  // detect (RN Modal, bottom sheets): SkipDraws keeps the state machine
  // advancing, Paused stops it too (composes with the pause()/play() state
  // rather than overwriting it).
  var renderMode: RenderMode = RenderMode.Enabled

  private val visibleRectBuffer = Rect()

  private fun isInVisibleViewport(): Boolean =
    isShown && getGlobalVisibleRect(visibleRectBuffer)

  var onError: ((String) -> Unit)? = null

  // Fired when the state machine settles (reaches rest, e.g. a non-looping
  // animation reaching its end); wired to the onStop prop.
  var onStop: (() -> Unit)? = null

  private var settledJob: Job? = null

  // rive-runtime's command server emits a settle signal on every advance
  // whose advanceAndApply returns false, not just on the settle edge — so
  // once the state machine is at rest we simply stop advancing it (also
  // saves CPU). Re-armed by whatever could actually move the state machine
  // again: pointer input, resuming playback, or a data-binding change.
  @Volatile
  private var settled = false

  private val errorListener: (String) -> Unit = { msg ->
    onError?.invoke(msg)
  }

  private val viewReadyDeferred = CompletableDeferred<Boolean>()
  private var boundInstance: ViewModelInstance? = null

  // Instances created by the view itself (Auto/ByName binding) must be closed
  // by the view; instances passed in from JS are owned by their JS wrapper.
  private var ownsBoundInstance = false
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
  private var disposed = false
  private var lastFrameTimeNs = 0L
  private var frameCount = 0L

  // While paused the loop still ticks, but only draws when something changed
  // (initial content, resize, rebinding) — otherwise a paused view would keep
  // re-rendering identical frames at full refresh rate.
  private var needsRedraw = true

  @Volatile
  private var paused = false

  private val viewScope = CoroutineScope(Dispatchers.Default + SupervisorJob())

  private val textureView = TextureView(context).apply {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    surfaceTextureListener = object : TextureView.SurfaceTextureListener {
      override fun onSurfaceTextureAvailable(st: SurfaceTexture, w: Int, h: Int) {
        Log.d(TAG, "onSurfaceTextureAvailable: ${w}x$h worker=${this@RiveReactNativeView.riveWorker != null}")
        this@RiveReactNativeView.surfaceTexture = st
        this@RiveReactNativeView.surfaceWidth = w
        this@RiveReactNativeView.surfaceHeight = h
        this@RiveReactNativeView.riveWorker?.let { worker ->
          if (this@RiveReactNativeView.riveSurface == null) {
            this@RiveReactNativeView.riveSurface = worker.createRiveSurface(SurfaceTextureSurface(st, w, h))
            Log.d(TAG, "onSurfaceTextureAvailable: surface created")
            resizeArtboardIfLayout()
          }
        }
      }

      override fun onSurfaceTextureDestroyed(st: SurfaceTexture): Boolean {
        this@RiveReactNativeView.riveSurface?.let { surface ->
          runCatching { surface.close() }
        }
        this@RiveReactNativeView.riveSurface = null
        return false
      }

      override fun onSurfaceTextureSizeChanged(st: SurfaceTexture, w: Int, h: Int) {
        this@RiveReactNativeView.surfaceWidth = w
        this@RiveReactNativeView.surfaceHeight = h
        this@RiveReactNativeView.needsRedraw = true
        // Since 11.7.x the render target keeps its creation-time size and
        // RiveSurface.resize() is internal to the SDK, so only the artboard
        // is resized here (same behavior as before the 11.7.2 bump).
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
      if (!renderLoopRunning || disposed) return

      val offscreen = offscreenBehavior != OffscreenBehavior.NONE && !isInVisibleViewport()
      val pausedOffscreen = offscreen && offscreenBehavior == OffscreenBehavior.PAUSE
      val renderPaused = renderMode == RenderMode.Paused

      if ((paused || pausedOffscreen || renderPaused) && !needsRedraw) {
        // Keep the timebase fresh so resuming advances by one frame, not by
        // the whole pause span.
        lastFrameTimeNs = frameTimeNanos
        Choreographer.getInstance().postFrameCallback(this)
        return
      }

      val capPeriodNs = frameRate
        ?.takeIf { it > 0 }
        ?.let { (1_000_000_000.0 / it).toLong() }
      if (capPeriodNs != null && lastFrameTimeNs != 0L &&
        frameTimeNanos - lastFrameTimeNs < capPeriodNs - CAP_TOLERANCE_NS
      ) {
        // Skip without touching lastFrameTimeNs: the eventual advance must
        // cover the full elapsed time so capped playback keeps wall-clock speed.
        Choreographer.getInstance().postFrameCallback(this)
        return
      }

      val deltaTime = if (lastFrameTimeNs == 0L) {
        Duration.ZERO
      } else {
        (frameTimeNanos - lastFrameTimeNs).nanoseconds
      }
      lastFrameTimeNs = frameTimeNanos

      val worker = riveWorker
      val art = artboardHandle
      val sm = stateMachineHandle
      val rs = riveSurface

      // Offscreen views keep advancing the state machine (events and
      // data-binding listeners stay live) and only skip the draw — the draw
      // is the dominant part of the offscreen cost. needsRedraw still forces
      // a draw so pending content (initial frame, resize, rebinding) isn't
      // lost while invisible.
      val skipDraw = renderMode != RenderMode.Enabled || offscreen

      if (worker != null && art != null && sm != null && rs != null) {
        try {
          if (!paused && !settled && !pausedOffscreen && !renderPaused) {
            worker.advanceStateMachine(sm, deltaTime)
          }
          if (!skipDraw || needsRedraw) {
            worker.draw(art, sm, rs, activeFit)
            needsRedraw = false
            frameCount++
            val isFirstFrame = frameCount == 1L
            if (isFirstFrame) {
              viewReadyDeferred.complete(true)
            }
          }
        } catch (e: Exception) {
          Log.e(TAG, "Render loop error", e)
        }
      }

      if (!disposed) {
        Choreographer.getInstance().postFrameCallback(this)
      }
    }
  }

  private fun startRenderLoop() {
    if (renderLoopRunning) return
    renderLoopRunning = true
    lastFrameTimeNs = 0L
    updateFrameRateHint()
    Choreographer.getInstance().postFrameCallback(renderCallback)
  }

  private fun stopRenderLoop() {
    renderLoopRunning = false
    updateFrameRateHint()
    Choreographer.getInstance().removeFrameCallback(renderCallback)
  }

  // Advisory platform hint (upstream applies the same one inside its Compose
  // loop): on capable displays a capped, actively-drawing view lets the
  // system lower the refresh rate, saving power beyond the skipped draws.
  // Callers may be off-main (play()/pause() run on a coroutine), so hop.
  private fun updateFrameRateHint() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) return
    UiThreadUtil.runOnUiThread {
      val fps = frameRate?.takeIf { it > 0 && renderLoopRunning && !paused }
      textureView.requestedFrameRate =
        fps?.toFloat() ?: View.REQUESTED_FRAME_RATE_CATEGORY_NO_PREFERENCE
    }
  }

  suspend fun awaitViewReady(): Boolean {
    return viewReadyDeferred.await()
  }

  fun configure(config: ViewConfiguration, dataBindingChanged: Boolean, reload: Boolean = false, initialUpdate: Boolean = false) {
    riveWorker = config.riveWorker
    activeFit = config.fit
    needsRedraw = true
    Log.d(
      TAG,
      "configure: reload=$reload initialUpdate=$initialUpdate fit=$activeFit surfaceTexture=${surfaceTexture != null} surfaceW=$surfaceWidth surfaceH=$surfaceHeight"
    )

    if (reload) {
      RiveErrorLogger.resetReportedErrors()
      RiveErrorLogger.addListener(errorListener)
      stateMachineHandle?.let { old ->
        runCatching { config.riveWorker.deleteStateMachine(old) }
      }
      stateMachineHandle = null
      artboard?.close()

      val newArtboard = if (config.artboardName != null) {
        Artboard.fromFile(config.riveFile, config.artboardName)
      } else {
        Artboard.fromFile(config.riveFile)
      }
      artboard = newArtboard
      artboardHandle = newArtboard.artboardHandle

      riveFile = config.riveFile

      val newStateMachineHandle = if (config.stateMachineName != null) {
        config.riveWorker.createStateMachineByName(newArtboard.artboardHandle, config.stateMachineName)
      } else {
        config.riveWorker.createDefaultStateMachine(newArtboard.artboardHandle)
      }
      stateMachineHandle = newStateMachineHandle
      observeSettled(config.riveWorker, newStateMachineHandle)

      if (surfaceTexture != null && riveSurface == null) {
        riveSurface = config.riveWorker.createRiveSurface(
          SurfaceTextureSurface(surfaceTexture!!, surfaceWidth, surfaceHeight)
        )
      }

      Log.d(TAG, "configure: artboard=${artboardHandle != null} sm=${stateMachineHandle != null} surface=${riveSurface != null}")

      paused = !config.autoPlay
      startRenderLoop()
    }

    resizeArtboardIfLayout()

    if (dataBindingChanged || initialUpdate || reload) {
      applyDataBinding(config.bindData, config.riveFile)
    }
  }

  private fun observeSettled(worker: CommandQueue, handle: StateMachineHandle) {
    settled = false
    settledJob?.cancel()
    settledJob = viewScope.launch {
      worker.settledFlow.collect { settledHandle ->
        if (settledHandle == handle && !settled) {
          settled = true
          onStop?.invoke()
        }
      }
    }
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
    val worker = riveWorker ?: run {
      Log.w(TAG, "touch: no worker")
      return
    }
    val smHandle = stateMachineHandle ?: run {
      Log.w(TAG, "touch: no smHandle")
      return
    }
    val w = surfaceWidth.toFloat()
    val h = surfaceHeight.toFloat()
    if (w <= 0 || h <= 0) {
      Log.w(TAG, "touch: invalid surface ${w}x$h")
      return
    }

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
      // A pointer event may move the state machine off rest; resume advancing
      // so the render loop actually applies its effect.
      settled = false
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

  private fun setBoundInstance(instance: ViewModelInstance?, owns: Boolean) {
    val previous = boundInstance
    if (ownsBoundInstance && previous != null && previous !== instance) {
      runCatching { previous.close() }
    }
    boundInstance = instance
    ownsBoundInstance = owns
  }

  private fun applyDataBinding(bindData: BindData, riveFile: RiveFile) {
    when (bindData) {
      is BindData.None -> {
        setBoundInstance(null, owns = false)
      }
      is BindData.Auto -> {
        viewScope.launch {
          try {
            val vmNames = riveFile.getViewModelNames()
            if (vmNames.isEmpty()) return@launch
            withContext(Dispatchers.Main) {
              if (disposed) return@withContext
              val art = artboard ?: return@withContext
              // Probe for a default ViewModel first — getDefaultViewModelInfo
              // throws when the artboard has none, a normal state. (Creating
              // the instance regardless and checking its handle against a
              // magic value relied on undocumented handle allocation.)
              try {
                riveFile.getDefaultViewModelInfo(art)
              } catch (e: Exception) {
                Log.d(TAG, "Auto-binding skipped: no default ViewModel for artboard")
                return@withContext
              }
              if (disposed) return@withContext
              val source = ViewModelSource.DefaultForArtboard(art).defaultInstance()
              val instance = ViewModelInstance.fromFile(riveFile, source)
              setBoundInstance(instance, owns = true)
              bindInstanceToStateMachine(instance)
            }
          } catch (e: Exception) {
            Log.d(TAG, "Auto-binding skipped: ${e.message}")
          }
        }
      }
      is BindData.Instance -> {
        setBoundInstance(bindData.instance, owns = false)
        bindInstanceToStateMachine(bindData.instance)
      }
      is BindData.ByName -> {
        try {
          val art = artboard ?: return
          val source = ViewModelSource.DefaultForArtboard(art).namedInstance(bindData.name)
          val instance = ViewModelInstance.fromFile(riveFile, source)
          setBoundInstance(instance, owns = true)
          bindInstanceToStateMachine(instance)
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
      needsRedraw = true
      settled = false
    } else {
      Log.w(TAG, "Cannot bind VMI: worker or state machine handle not available")
    }
  }

  fun play() {
    paused = false
    settled = false
    updateFrameRateHint()
  }

  fun pause() {
    paused = true
    updateFrameRateHint()
  }

  // Deprecated: the experimental Rive runtime has no reset primitive.
  fun reset() {
    RiveLog.e(TAG, "reset() is deprecated and not supported on the experimental backend")
  }

  fun playIfNeeded() {
    paused = false
    settled = false
    updateFrameRateHint()
  }

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

  // Runs twice per view: eagerly from HybridRiveView.dispose() (JS unmount,
  // posted to main) and from RiveViewManager.onDropViewInstance — must stay
  // idempotent and on the main thread (Choreographer is thread-local).
  fun dispose() {
    if (disposed) return
    disposed = true
    viewReadyDeferred.complete(false)
    settledJob?.cancel()
    viewScope.cancel()
    RiveErrorLogger.removeListener(errorListener)
    stopRenderLoop()
    // The command queue is FIFO, so deletes enqueued here run after any
    // still-pending draw commands that reference these handles.
    setBoundInstance(null, owns = false)
    stateMachineHandle?.let { old ->
      riveWorker?.let { worker -> runCatching { worker.deleteStateMachine(old) } }
    }
    artboard?.let { runCatching { it.close() } }
    riveSurface?.let { runCatching { it.close() } }
    artboard = null
    artboardHandle = null
    stateMachineHandle = null
    riveSurface = null
  }
}
