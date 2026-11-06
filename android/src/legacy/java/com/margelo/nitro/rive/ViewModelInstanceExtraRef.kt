package com.margelo.nitro.rive

import android.util.Log
import app.rive.runtime.kotlin.core.ViewModelInstance
import com.rive.BuildConfig

// rive-android's ViewModel.create*Instance hands Kotlin a pointer that already
// owns one native ref, and the ViewModelInstance constructor takes a second that
// release() never drops, so created instances (and images bound to them) outlive
// their File. Dropping it on a release without the bug would free an instance
// still in use, so only versions known to be affected are patched.
private val AFFECTED_VERSIONS = versionCode(10, 4, 5)..versionCode(11, 14, 3)

private fun versionCode(major: Int, minor: Int, patch: Int) =
  major * 1_000_000L + minor * 1_000L + patch

private fun parseVersion(version: String): Long? {
  val parts = version.substringBefore('-').split('.').map { it.toIntOrNull() ?: return null }
  if (parts.size != 3) return null
  return versionCode(parts[0], parts[1], parts[2])
}

private val derefInstance = runCatching {
  val version = parseVersion(BuildConfig.RIVE_ANDROID_VERSION)
  if (version == null || version !in AFFECTED_VERSIONS) return@runCatching null
  ViewModelInstance::class.java
    .getDeclaredMethod("cppDerefInstance", Long::class.javaPrimitiveType)
    .apply { isAccessible = true }
}.onFailure { Log.w("RiveViewModelInstance", "Can't drop the extra native ref", it) }
  .getOrNull()

internal fun ViewModelInstance.dropExtraNativeRef(): ViewModelInstance {
  derefInstance?.invoke(this, cppPointer)
  return this
}
