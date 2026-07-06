package rive.example

import android.view.View
import android.view.ViewGroup
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.rive.RiveReactNativeView

/**
 * Test helper for the disposed-file re-attach reproducer
 * (example/src/reproducers/DisposedFileReattach.tsx).
 *
 * Simulates what Fabric view recycling does to a dropped Rive view: keeps a
 * reference to the Android view across the React unmount, then re-attaches it
 * to the window. Exceptions from re-attaching are reported back to JS instead
 * of crashing the app, so the reproducer can display the result.
 */
class RiveViewReattachModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  private var captured: RiveReactNativeView? = null

  override fun getName() = "RiveViewReattach"

  private fun findRiveView(view: View): RiveReactNativeView? {
    if (view is RiveReactNativeView) return view
    if (view is ViewGroup) {
      for (i in 0 until view.childCount) {
        findRiveView(view.getChildAt(i))?.let { return it }
      }
    }
    return null
  }

  @ReactMethod
  fun captureRiveView(promise: Promise) {
    val activity = currentActivity
      ?: return promise.reject("no_activity", "No current activity")
    activity.runOnUiThread {
      val content = activity.findViewById<ViewGroup>(android.R.id.content)
      captured = findRiveView(content)
      promise.resolve(captured != null)
    }
  }

  @ReactMethod
  fun reattachCapturedView(promise: Promise) {
    val activity = currentActivity
      ?: return promise.reject("no_activity", "No current activity")
    val view = captured
      ?: return promise.reject("no_view", "No captured view; call captureRiveView first")
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
  }

  @ReactMethod
  fun releaseCapturedView(promise: Promise) {
    val activity = currentActivity
    val view = captured
    captured = null
    if (activity == null || view == null) {
      promise.resolve(null)
      return
    }
    activity.runOnUiThread {
      try {
        (view.parent as? ViewGroup)?.removeView(view)
      } catch (_: Throwable) {
        // Detaching a broken view can throw too; the repro is already over.
      }
      promise.resolve(null)
    }
  }
}
