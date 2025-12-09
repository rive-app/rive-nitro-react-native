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

  override fun instanceAt(index: Double): HybridViewModelInstanceSpec? {
    return try {
      HybridViewModelInstance(listProperty.elementAt(index.toInt()))
    } catch (e: IndexOutOfBoundsException) {
      null
    }
  }

  override fun addInstance(instance: HybridViewModelInstanceSpec) {
    val hybridInstance = instance as? HybridViewModelInstance ?: return
    listProperty.add(hybridInstance.viewModelInstance)
  }

  override fun insertInstance(instance: HybridViewModelInstanceSpec, index: Double) {
    val hybridInstance = instance as? HybridViewModelInstance ?: return
    listProperty.add(index.toInt(), hybridInstance.viewModelInstance)
  }

  override fun removeInstance(instance: HybridViewModelInstanceSpec) {
    val hybridInstance = instance as? HybridViewModelInstance ?: return
    listProperty.remove(hybridInstance.viewModelInstance)
  }

  override fun removeInstanceAt(index: Double) {
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
