package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModel
import app.rive.runtime.kotlin.core.errors.ViewModelException
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise

@Keep
@DoNotStrip
class HybridViewModel(private val viewModel: ViewModel) : HybridViewModelSpec() {
  override val propertyCount: Double
    get() = viewModel.propertyCount.toDouble()
  override val instanceCount: Double
    get() = viewModel.instanceCount.toDouble()
  override val modelName: String
    get() = viewModel.name

  override fun createInstanceByIndex(index: Double): HybridViewModelInstanceSpec? {
    if (index < 0) return null
    try {
      val vmi = viewModel.createInstanceFromIndex(index.toInt())
      return HybridViewModelInstance(vmi)
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun createInstanceByName(name: String): HybridViewModelInstanceSpec? {
    try {
      val vmi = viewModel.createInstanceFromName(name)
      return HybridViewModelInstance(vmi)
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun createDefaultInstance(): HybridViewModelInstanceSpec? {
    try {
      val vmi = viewModel.createDefaultInstance()
      return HybridViewModelInstance(vmi)
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun createInstance(): HybridViewModelInstanceSpec? {
    try {
      val vmi = viewModel.createBlankInstance()
      return HybridViewModelInstance(vmi)
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun getPropertiesAsync(): Promise<Array<ViewModelPropertyInfo>> {
    return Promise.rejected(UnsupportedOperationException("getPropertiesAsync is not supported on the legacy backend"))
  }

  // Main-hopped like HybridRiveFile's lookups — the legacy runtime is only
  // safe to touch on the main thread (see riveMainScope).
  override fun getPropertyCountAsync(): Promise<Double> {
    return Promise.async(riveMainScope) { propertyCount }
  }

  override fun getInstanceCountAsync(): Promise<Double> {
    return Promise.async(riveMainScope) { instanceCount }
  }

  override fun createInstanceByNameAsync(name: String): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async(riveMainScope) { createInstanceByName(name) }
  }

  override fun createDefaultInstanceAsync(): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async(riveMainScope) { createDefaultInstance() }
  }

  override fun createBlankInstanceAsync(): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async(riveMainScope) { createInstance() }
  }
}
