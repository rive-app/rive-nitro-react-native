package com.margelo.nitro.rivedebugutils

import android.view.View
import android.view.ViewGroup
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

/**
 * Test helper for the example apps: simulates what Fabric view recycling does
 * to a dropped view. Captures a view before the React unmount, then re-attaches
 * it to the window afterwards. Exceptions from re-attaching are reported back
 * to JS instead of crashing the app, so reproducer pages can show the result.
 */
@Keep
@DoNotStrip
class HybridDebugUtils : HybridDebugUtilsSpec() {
  private var captured: View? = null

  private fun findView(view: View, className: String): View? {
    if (view.javaClass.name == className) return view
    if (view is ViewGroup) {
      for (i in 0 until view.childCount) {
        findView(view.getChildAt(i), className)?.let { return it }
      }
    }
    return null
  }

  override fun captureView(viewClassName: String): Promise<Boolean> {
    val promise = Promise<Boolean>()
    val activity = NitroModules.applicationContext?.currentActivity
      ?: return promise.apply { reject(Error("No current activity")) }
    activity.runOnUiThread {
      val content = activity.findViewById<ViewGroup>(android.R.id.content)
      captured = findView(content, viewClassName)
      promise.resolve(captured != null)
    }
    return promise
  }

  override fun reattachCapturedView(): Promise<String> {
    val promise = Promise<String>()
    val activity = NitroModules.applicationContext?.currentActivity
      ?: return promise.apply { reject(Error("No current activity")) }
    val view = captured
      ?: return promise.apply { reject(Error("No captured view; call captureView first")) }
    activity.runOnUiThread {
      try {
        (view.parent as? ViewGroup)?.removeView(view)
        val content = activity.findViewById<ViewGroup>(android.R.id.content)
        content.addView(view, ViewGroup.LayoutParams(1, 1))
        promise.resolve("no-crash")
      } catch (t: Throwable) {
        val stack = t.stackTrace.take(12).joinToString("\n") { "  at $it" }
        promise.resolve("${t.javaClass.simpleName}: ${t.message}\n$stack")
      }
    }
    return promise
  }

  override fun releaseCapturedView(): Promise<Unit> {
    val promise = Promise<Unit>()
    val activity = NitroModules.applicationContext?.currentActivity
    val view = captured
    captured = null
    if (activity == null || view == null) {
      promise.resolve(Unit)
      return promise
    }
    activity.runOnUiThread {
      try {
        (view.parent as? ViewGroup)?.removeView(view)
      } catch (_: Throwable) {
        // Detaching a broken view can throw too; the repro is already over.
      }
      promise.resolve(Unit)
    }
    return promise
  }
}
