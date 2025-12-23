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

  // Note: Android SDK doesn't expose ViewModelInstance.properties publicly
  override val properties: Array<ViewModelPropertyInfo>
    get() = emptyArray()

  // Returns null if ViewModelException is thrown for iOS parity
  // (iOS SDK returns nil when property not found, Android SDK throws)
  private inline fun <T> getPropertyOrNull(block: () -> T): T? {
    return try {
      block()
    } catch (e: ViewModelException) {
      null
    }
  }

  override fun numberProperty(path: String) = getPropertyOrNull {
    HybridViewModelNumberProperty(viewModelInstance.getNumberProperty(path))
  }

  override fun stringProperty(path: String) = getPropertyOrNull {
    HybridViewModelStringProperty(viewModelInstance.getStringProperty(path))
  }

  override fun booleanProperty(path: String) = getPropertyOrNull {
    HybridViewModelBooleanProperty(viewModelInstance.getBooleanProperty(path))
  }

  override fun colorProperty(path: String) = getPropertyOrNull {
    HybridViewModelColorProperty(viewModelInstance.getColorProperty(path))
  }

  override fun enumProperty(path: String) = getPropertyOrNull {
    HybridViewModelEnumProperty(viewModelInstance.getEnumProperty(path))
  }

  override fun triggerProperty(path: String) = getPropertyOrNull {
    HybridViewModelTriggerProperty(viewModelInstance.getTriggerProperty(path))
  }

  override fun imageProperty(path: String) = getPropertyOrNull {
    HybridViewModelImageProperty(viewModelInstance.getImageProperty(path))
  }

  override fun listProperty(path: String) = getPropertyOrNull {
    HybridViewModelListProperty(viewModelInstance.getListProperty(path))
  }
}
