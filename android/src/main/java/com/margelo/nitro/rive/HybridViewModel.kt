package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModel
import app.rive.runtime.kotlin.core.errors.ViewModelException
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridViewModel(private val viewModel: ViewModel) : HybridViewModelSpec() {
  override val propertyCount: Double
    get() = viewModel.propertyCount.toDouble()
  override val instanceCount: Double
    get() = viewModel.instanceCount.toDouble()
  override val name: String
    get() = viewModel.name

  override fun createInstanceByIndex(index: Double): HybridViewModelInstanceSpec? {
    try {
      val vmi = viewModel.createInstanceFromIndex(index.toInt())
      return HybridViewModelInstance(vmi);
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun createInstanceByName(name: String): HybridViewModelInstanceSpec? {
    try {
      val vmi = viewModel.createInstanceFromName(name)
      return HybridViewModelInstance(vmi);
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun createDefaultInstance(): HybridViewModelInstanceSpec? {
    try {
      val vmi = viewModel.createDefaultInstance()
      return HybridViewModelInstance(vmi);
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun createInstance(): HybridViewModelInstanceSpec? {
    try {
      val vmi = viewModel.createBlankInstance()
      return HybridViewModelInstance(vmi);
    } catch (e: ViewModelException) {
      return null
    }
  }
}
