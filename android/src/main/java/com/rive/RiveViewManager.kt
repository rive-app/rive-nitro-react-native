package com.rive

import android.view.View
import com.margelo.nitro.rive.views.HybridRiveViewManager

class RiveViewManager : HybridRiveViewManager() {
  override fun onDropViewInstance(view: View) {
    (view as? RiveReactNativeView)?.dispose()
    super.onDropViewInstance(view)
  }
}
