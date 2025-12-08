package com.margelo.nitro.rive

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

object FileDataLoader : DataLoader {
  override suspend fun load(source: DataSource): ByteArray {
    val fileSource = source as? DataSource.File
      ?: throw DataLoaderException.InvalidSource
    return loadBytes(fileSource.path)
  }

  suspend fun loadBytes(path: String): ByteArray = withContext(Dispatchers.IO) {
    val file = File(path)
    if (!file.exists()) {
      throw DataLoaderException.FileNotFound(path)
    }
    file.readBytes()
  }
}
