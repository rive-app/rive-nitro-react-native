package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelInstance
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridViewModelInstance(val viewModelInstance: ViewModelInstance) : HybridViewModelInstanceSpec() {
  override val name: String
    get() = viewModelInstance.name
}
