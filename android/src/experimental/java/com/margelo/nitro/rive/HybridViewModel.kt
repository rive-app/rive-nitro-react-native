package com.margelo.nitro.rive

import android.util.Log
import androidx.annotation.Keep
import app.rive.RiveFile
import app.rive.ViewModelInstance
import app.rive.ViewModelInstanceSource
import app.rive.ViewModelSource
import app.rive.core.CommandQueue
import com.facebook.proguard.annotations.DoNotStrip
import kotlinx.coroutines.runBlocking

@Keep
@DoNotStrip
class HybridViewModel(
  private val riveFile: RiveFile,
  private val riveWorker: CommandQueue,
  private val viewModelName: String,
  private val parentFile: HybridRiveFile
) : HybridViewModelSpec() {
  companion object {
    private const val TAG = "HybridViewModel"
  }

  override val propertyCount: Double
    get() = 0.0

  override val instanceCount: Double
    get() = 0.0

  override val modelName: String
    get() = viewModelName

  private val vmSource: ViewModelSource.Named
    get() = ViewModelSource.Named(viewModelName)

  override fun createInstanceByIndex(index: Double): HybridViewModelInstanceSpec? {
    return createDefaultInstance()
  }

  override fun createInstanceByName(name: String): HybridViewModelInstanceSpec? {
    return try {
      val source = vmSource.namedInstance(name)
      val vmi = ViewModelInstance.fromFile(riveFile, source)
      HybridViewModelInstance(vmi, riveWorker, parentFile)
    } catch (e: Exception) {
      Log.e(TAG, "createInstanceByName('$name') failed", e)
      null
    }
  }

  override fun createDefaultInstance(): HybridViewModelInstanceSpec? {
    return try {
      val source = vmSource.defaultInstance()
      val vmi = ViewModelInstance.fromFile(riveFile, source)
      HybridViewModelInstance(vmi, riveWorker, parentFile)
    } catch (e: Exception) {
      Log.e(TAG, "createDefaultInstance failed", e)
      null
    }
  }

  override fun createInstance(): HybridViewModelInstanceSpec? {
    return try {
      val source = vmSource.blankInstance()
      val vmi = ViewModelInstance.fromFile(riveFile, source)
      HybridViewModelInstance(vmi, riveWorker, parentFile)
    } catch (e: Exception) {
      Log.e(TAG, "createInstance (blank) failed", e)
      null
    }
  }
}
