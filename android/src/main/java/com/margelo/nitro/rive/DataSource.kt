package com.margelo.nitro.rive

import com.margelo.nitro.core.ArrayBuffer
import java.net.URI

sealed class DataSource {
  data class Http(val url: String) : DataSource()
  data class File(val path: String) : DataSource()
  data class Resource(val name: String) : DataSource()
  class Bytes(val data: ByteArray) : DataSource() {
    companion object {
      fun from(buffer: ArrayBuffer): Bytes {
        val byteBuffer = buffer.getBuffer(false)
        val byteArray = ByteArray(byteBuffer.remaining())
        byteBuffer.get(byteArray)
        return Bytes(byteArray)
      }
    }
  }

  companion object {
    fun fromURL(url: String): DataSource {
      val uri = URI(url)
      return if (uri.scheme == "file") File(uri.path) else Http(url)
    }

    fun resource(nameWithExtension: String): Resource {
      return Resource(nameWithExtension.substringBeforeLast("."))
    }
  }

  fun createLoader(): DataLoader = when (this) {
    is Http -> HTTPDataLoader
    is File -> FileDataLoader
    is Resource -> ResourceDataLoader
    is Bytes -> BytesDataLoader
  }
}
