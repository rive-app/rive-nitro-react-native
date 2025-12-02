package com.margelo.nitro.rive

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.MalformedURLException
import java.net.URL

object HTTPDataLoader : DataLoader {
  override suspend fun load(source: DataSource): ByteArray {
    val httpSource = source as? DataSource.Http
      ?: throw DataLoaderException.InvalidSource
    return downloadBytes(httpSource.url)
  }

  suspend fun downloadBytes(url: String): ByteArray = withContext(Dispatchers.IO) {
    val urlObj = try {
      URL(url)
    } catch (e: MalformedURLException) {
      throw DataLoaderException.InvalidURL(url)
    }
    val connection = urlObj.openConnection() as HttpURLConnection

    try {
      connection.requestMethod = "GET"
      val statusCode = connection.responseCode

      if (statusCode !in 200..299) {
        throw DataLoaderException.HttpError(statusCode, url)
      }

      connection.inputStream.use { it.readBytes() }
    } finally {
      connection.disconnect()
    }
  }
}
