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

  // Deprecated: Use createInstanceByNameAsync instead
  override fun createInstanceByIndex(index: Double): HybridViewModelInstanceSpec? {
    if (index < 0) return null
    try {
      val vmi = viewModel.createInstanceFromIndex(index.toInt())
      return HybridViewModelInstance(vmi)
    } catch (e: ViewModelException) {
      return null
    }
  }

  // Deprecated: Use createInstanceByNameAsync instead
  override fun createInstanceByName(name: String): HybridViewModelInstanceSpec? {
    try {
      val vmi = viewModel.createInstanceFromName(name)
      return HybridViewModelInstance(vmi)
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun createInstanceByNameAsync(name: String): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async {
      try {
        val vmi = viewModel.createInstanceFromName(name)
        HybridViewModelInstance(vmi)
      } catch (e: ViewModelException) {
        null
      }
    }
  }

  // Deprecated: Use createDefaultInstanceAsync instead
  override fun createDefaultInstance(): HybridViewModelInstanceSpec? {
    try {
      val vmi = viewModel.createDefaultInstance()
      return HybridViewModelInstance(vmi)
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun createDefaultInstanceAsync(): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async {
      try {
        val vmi = viewModel.createDefaultInstance()
        HybridViewModelInstance(vmi)
      } catch (e: ViewModelException) {
        null
      }
    }
  }

  // Deprecated: Use createInstanceAsync instead
  override fun createInstance(): HybridViewModelInstanceSpec? {
    try {
      val vmi = viewModel.createBlankInstance()
      return HybridViewModelInstance(vmi)
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun getPropertyCountAsync(): Promise<Double> {
    return Promise.async { propertyCount }
  }

  override fun getInstanceCountAsync(): Promise<Double> {
    return Promise.async { instanceCount }
  }

  override fun createInstanceByNameAsync(name: String): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async { createInstanceByName(name) }
  }

  override fun createDefaultInstanceAsync(): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async { createDefaultInstance() }
  }

  override fun createBlankInstanceAsync(): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async { createInstance() }
  }
}
