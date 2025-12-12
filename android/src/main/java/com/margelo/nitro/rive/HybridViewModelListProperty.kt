package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelListProperty
import com.facebook.proguard.annotations.DoNotStrip
import kotlinx.coroutines.flow.map

@Keep
@DoNotStrip
class HybridViewModelListProperty(private val listProperty: ViewModelListProperty) :
  HybridViewModelListPropertySpec(),
  BaseHybridViewModelProperty<Unit> by BaseHybridViewModelPropertyImpl() {
  override val length: Double
    get() = listProperty.size.toDouble()

  private fun requireHybridInstance(instance: HybridViewModelInstanceSpec): HybridViewModelInstance {
    return instance as? HybridViewModelInstance
      ?: throw IllegalArgumentException("Expected HybridViewModelInstance but got ${instance::class.simpleName}")
  }

  override fun getInstanceAt(index: Double): HybridViewModelInstanceSpec? {
    val idx = index.toInt()
    if (idx < 0 || idx >= listProperty.size) return null
    return HybridViewModelInstance(listProperty.elementAt(idx))
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

  override fun addListener(onChanged: () -> Unit) {
    listeners.add { _: Unit -> onChanged() }
    ensureValueListenerJob(listProperty.valueFlow.map { })
  }
}
