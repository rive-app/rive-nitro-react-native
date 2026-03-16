package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelListProperty
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.flow.map

@Keep
@DoNotStrip
class HybridViewModelListProperty(private val listProperty: ViewModelListProperty) :
  HybridViewModelListPropertySpec(),
  BaseHybridViewModelProperty<Unit> by BaseHybridViewModelPropertyImpl() {
  // Deprecated: Use getLengthAsync instead
  override val length: Double
    get() = listProperty.size.toDouble()

  override fun getLengthAsync(): Promise<Double> {
    return Promise.async { listProperty.size.toDouble() }
  }

  private fun requireHybridInstance(instance: HybridViewModelInstanceSpec): HybridViewModelInstance {
    return instance as? HybridViewModelInstance
      ?: throw IllegalArgumentException("Expected HybridViewModelInstance but got ${instance::class.simpleName}")
  }

  // Deprecated: Use getInstanceAtAsync instead
  override fun getInstanceAt(index: Double): HybridViewModelInstanceSpec? {
    val idx = index.toInt()
    if (idx < 0 || idx >= listProperty.size) return null
    return HybridViewModelInstance(listProperty.elementAt(idx))
  }

  override fun getInstanceAtAsync(index: Double): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async {
      val idx = index.toInt()
      if (idx < 0 || idx >= listProperty.size) null
      else HybridViewModelInstance(listProperty.elementAt(idx))
    }
  }

  override fun addInstance(instance: HybridViewModelInstanceSpec) {
    val hybridInstance = requireHybridInstance(instance)
    listProperty.add(hybridInstance.viewModelInstance)
  }

  override fun addInstanceAt(instance: HybridViewModelInstanceSpec, index: Double): Boolean {
    val hybridInstance = requireHybridInstance(instance)
    val idx = index.toInt()
    if (idx < 0 || idx > listProperty.size) return false
    listProperty.add(idx, hybridInstance.viewModelInstance)
    return true
  }

  override fun removeInstance(instance: HybridViewModelInstanceSpec) {
    val hybridInstance = requireHybridInstance(instance)
    listProperty.remove(hybridInstance.viewModelInstance)
  }

  override fun removeInstanceAt(index: Double) {
    listProperty.removeAt(index.toInt())
  }

  override fun swap(index1: Double, index2: Double): Boolean {
    val idx1 = index1.toInt()
    val idx2 = index2.toInt()
    if (idx1 < 0 || idx1 >= listProperty.size || idx2 < 0 || idx2 >= listProperty.size) {
      return false
    }
    listProperty.swap(idx1, idx2)
    return true
  }

  override fun getLengthAsync(): Promise<Double> {
    return Promise.async { length }
  }

  override fun getInstanceAtAsync(index: Double): Promise<HybridViewModelInstanceSpec?> {
    return Promise.async { getInstanceAt(index) }
  }

  override fun addInstanceAsync(instance: HybridViewModelInstanceSpec): Promise<Unit> {
    return Promise.async { addInstance(instance) }
  }

  override fun addInstanceAtAsync(instance: HybridViewModelInstanceSpec, index: Double): Promise<Unit> {
    return Promise.async { addInstanceAt(instance, index) }
  }

  override fun removeInstanceAsync(instance: HybridViewModelInstanceSpec): Promise<Unit> {
    return Promise.async { removeInstance(instance) }
  }

  override fun removeInstanceAtAsync(index: Double): Promise<Unit> {
    return Promise.async { removeInstanceAt(index) }
  }

  override fun swapAsync(index1: Double, index2: Double): Promise<Unit> {
    return Promise.async { swap(index1, index2) }
  }

  override fun addListener(onChanged: () -> Unit): () -> Unit {
    val remover = addListenerInternal { _ -> onChanged() }
    ensureValueListenerJob(listProperty.valueFlow.map { })
    return remover
  }
}
