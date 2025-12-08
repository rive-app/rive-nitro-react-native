package com.margelo.nitro.rive

object BytesDataLoader : DataLoader {
  override suspend fun load(source: DataSource): ByteArray {
    val bytesSource = source as? DataSource.Bytes
      ?: throw DataLoaderException.InvalidSource
    return bytesSource.data
  }
}
