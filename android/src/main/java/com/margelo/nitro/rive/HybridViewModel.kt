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
  override val modelName: String
    get() = viewModel.name

  override val properties: Array<ViewModelPropertyInfo>
    get() {
      val mapped = viewModel.properties.map { prop ->
        ViewModelPropertyInfo(name = prop.name, type = mapPropertyType(prop.type))
      }
      return mapped.toTypedArray()
    }

  override fun createInstanceByIndex(index: Double): HybridViewModelInstanceSpec? {
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

  companion object {
    fun mapPropertyType(type: ViewModel.PropertyDataType): ViewModelPropertyType = when (type) {
      ViewModel.PropertyDataType.NONE -> ViewModelPropertyType.NONE
      ViewModel.PropertyDataType.STRING -> ViewModelPropertyType.STRING
      ViewModel.PropertyDataType.NUMBER -> ViewModelPropertyType.NUMBER
      ViewModel.PropertyDataType.BOOLEAN -> ViewModelPropertyType.BOOLEAN
      ViewModel.PropertyDataType.COLOR -> ViewModelPropertyType.COLOR
      ViewModel.PropertyDataType.LIST -> ViewModelPropertyType.LIST
      ViewModel.PropertyDataType.ENUM -> ViewModelPropertyType.ENUM
      ViewModel.PropertyDataType.TRIGGER -> ViewModelPropertyType.TRIGGER
      ViewModel.PropertyDataType.VIEW_MODEL -> ViewModelPropertyType.VIEWMODEL
      ViewModel.PropertyDataType.INTEGER -> ViewModelPropertyType.INTEGER
      ViewModel.PropertyDataType.SYMBOL_LIST_INDEX -> ViewModelPropertyType.SYMBOLLISTINDEX
      ViewModel.PropertyDataType.ASSET_IMAGE -> ViewModelPropertyType.ASSETIMAGE
      ViewModel.PropertyDataType.ARTBOARD -> ViewModelPropertyType.ARTBOARD
    }
  }
}
