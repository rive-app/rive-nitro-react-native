package com.margelo.nitro.rive

import android.annotation.SuppressLint
import android.content.Context
import com.margelo.nitro.NitroModules
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object ResourceDataLoader : DataLoader {
  override suspend fun load(source: DataSource): ByteArray {
    val resourceSource = source as? DataSource.Resource
      ?: throw DataLoaderException.InvalidSource
    return loadBytes(resourceSource.name)
  }

  @SuppressLint("DiscouragedApi")
  suspend fun loadBytes(name: String): ByteArray = withContext(Dispatchers.IO) {
    val context = NitroModules.applicationContext
      ?: throw DataLoaderException.NoContext

    val resourceId = getResourceId(name, context)
    if (resourceId == 0) {
      throw DataLoaderException.ResourceNotFound(name)
    }

    context.resources.openRawResource(resourceId).use { inputStream ->
      inputStream.readBytes()
    }
  }

  @SuppressLint("DiscouragedApi")
  private fun getResourceId(source: String, context: Context): Int {
    val resourceTypes = listOf("raw", "drawable")

    for (type in resourceTypes) {
      val resourceId = context.resources.getIdentifier(source, type, context.packageName)
      if (resourceId != 0) {
        return resourceId
      }
    }

    return 0
  }
}
