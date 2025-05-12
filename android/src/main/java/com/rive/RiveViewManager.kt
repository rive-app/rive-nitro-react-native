package com.rive

import android.graphics.Color
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.RiveViewManagerInterface
import com.facebook.react.viewmanagers.RiveViewManagerDelegate

@ReactModule(name = RiveViewManager.NAME)
class RiveViewManager : SimpleViewManager<RiveView>(),
  RiveViewManagerInterface<RiveView> {
  private val mDelegate: ViewManagerDelegate<RiveView>

  init {
    mDelegate = RiveViewManagerDelegate(this)
  }

  override fun getDelegate(): ViewManagerDelegate<RiveView>? {
    return mDelegate
  }

  override fun getName(): String {
    return NAME
  }

  public override fun createViewInstance(context: ThemedReactContext): RiveView {
    return RiveView(context)
  }

  @ReactProp(name = "color")
  override fun setColor(view: RiveView?, color: String?) {
    view?.setBackgroundColor(Color.parseColor(color))
  }

  companion object {
    const val NAME = "RiveView"
  }
}
