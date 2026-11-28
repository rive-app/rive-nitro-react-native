package com.margelo.nitro.rive

import com.margelo.nitro.core.Promise
import com.rive.RiveReactNativeView

// Applies the write on the calling thread so consecutive set() calls land in call order.
internal inline fun writeProperty(write: () -> Unit): Promise<Unit> =
  try {
    write()
    RiveReactNativeView.onViewModelChanged()
    Promise.resolved(Unit)
  } catch (e: Throwable) {
    Promise.rejected(e)
  }
