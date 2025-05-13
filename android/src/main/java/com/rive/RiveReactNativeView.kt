package com.rive

import android.annotation.SuppressLint
import android.util.Log
import android.widget.FrameLayout
import com.facebook.react.uimanager.ThemedReactContext
import app.rive.runtime.kotlin.RiveAnimationView
import app.rive.runtime.kotlin.core.File
import app.rive.runtime.kotlin.core.Fit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.URL

@SuppressLint("ViewConstructor")
class RiveReactNativeView(private val context: ThemedReactContext) : FrameLayout(context) {
  private var riveAnimationView: RiveAnimationView? = null

  init {
    riveAnimationView = RiveAnimationView(context)
    addView(riveAnimationView)

    demoUrlResource()
  }

  //region Public Methods (API)
  fun play() {
    riveAnimationView?.play();
  }

  fun pause() {
    Log.d("findme", "yay calling pause")
    riveAnimationView?.pause();
  }
  //endregion

  //region Internal
  private fun demoUrlResource() {
    val riveUrl = "https://cdn.rive.app/animations/vehicles.riv"
    CoroutineScope(Dispatchers.Main).launch {
      val riveBytes = withContext(Dispatchers.IO) {
        downloadRiveFile(riveUrl)
      }
      riveBytes?.let {
        val riveFile = File(it)
        riveAnimationView?.setRiveFile(riveFile, fit = Fit.CONTAIN, autoplay = true)
        riveFile.release()
      }
    }
  }

  private fun downloadRiveFile(url: String): ByteArray? {
    return try {
      URL(url).openStream().use { it.readBytes() }
    } catch (e: Exception) {
      e.printStackTrace()
      null
    }
  }
  //endregion
}
