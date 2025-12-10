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

  override fun instanceAt(index: Double): HybridViewModelInstanceSpec? {
    val idx = index.toInt()
    if (idx < 0 || idx >= listProperty.size) return null
    return HybridViewModelInstance(listProperty.elementAt(idx))
  }

  override fun append(instance: HybridViewModelInstanceSpec) {
    val hybridInstance = requireHybridInstance(instance)
    listProperty.add(hybridInstance.viewModelInstance)
  }

  override fun insert(instance: HybridViewModelInstanceSpec, index: Double) {
    val hybridInstance = requireHybridInstance(instance)
    listProperty.add(index.toInt(), hybridInstance.viewModelInstance)
  }

  override fun remove(instance: HybridViewModelInstanceSpec) {
    val hybridInstance = requireHybridInstance(instance)
    listProperty.remove(hybridInstance.viewModelInstance)
  }

  override fun removeAt(index: Double) {
    listProperty.removeAt(index.toInt())
  }

  override fun swap(index1: Double, index2: Double) {
    listProperty.swap(index1.toInt(), index2.toInt())
  }

  override fun addListener(onChanged: () -> Unit) {
    listeners.add { _ -> onChanged() }
    ensureValueListenerJob(listProperty.valueFlow.map { })
  }
}
