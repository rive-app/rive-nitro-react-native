package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.ViewModelInstance
import app.rive.runtime.kotlin.core.errors.ViewModelException
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridViewModelInstance(val viewModelInstance: ViewModelInstance) : HybridViewModelInstanceSpec() {
  override val instanceName: String
    get() = viewModelInstance.name

  override fun numberProperty(path: String): HybridViewModelNumberPropertySpec? {
    try {
        val numberProper = viewModelInstance.getNumberProperty(path)
        return HybridViewModelNumberProperty(numberProper)
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun stringProperty(path: String): HybridViewModelStringPropertySpec? {
    try {
      val stringProperty = viewModelInstance.getStringProperty(path)
      return HybridViewModelStringProperty(stringProperty)
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun booleanProperty(path: String): HybridViewModelBooleanPropertySpec? {
    try {
      val booleanProperty = viewModelInstance.getBooleanProperty(path)
      return HybridViewModelBooleanProperty(booleanProperty)
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun colorProperty(path: String): HybridViewModelColorPropertySpec? {
    try {
      val colorProperty = viewModelInstance.getColorProperty(path)
      return HybridViewModelColorProperty(colorProperty)
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun enumProperty(path: String): HybridViewModelEnumPropertySpec? {
    try {
      val enumProperty = viewModelInstance.getEnumProperty(path)
      return HybridViewModelEnumProperty(enumProperty)
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun triggerProperty(path: String): HybridViewModelTriggerPropertySpec? {
    try {
      val triggerProperty = viewModelInstance.getTriggerProperty(path)
      return HybridViewModelTriggerProperty(triggerProperty)
    } catch (e: ViewModelException) {
      return null
    }
  }

  override fun imageProperty(path: String): HybridViewModelImagePropertySpec? {
    try {
      val imageProperty = viewModelInstance.getImageProperty(path)
      return HybridViewModelImageProperty(imageProperty)
    } catch (e: ViewModelException) {
      return null
    }
  }
}
