package com.margelo.nitro.rive

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

sealed class HTTPLoaderException(message: String) : Exception(message) {
  class InvalidURL(url: String) : HTTPLoaderException("Invalid URL: $url")
  class HttpError(val statusCode: Int, url: String) :
    HTTPLoaderException("HTTP error $statusCode for $url")
}

object HTTPLoader {
  suspend fun downloadBytes(url: String): ByteArray = withContext(Dispatchers.IO) {
    val urlObj = URL(url)
    val connection = urlObj.openConnection() as HttpURLConnection

    try {
      connection.requestMethod = "GET"
      val statusCode = connection.responseCode

      if (statusCode !in 200..299) {
        throw HTTPLoaderException.HttpError(statusCode, url)
      }

      connection.inputStream.use { it.readBytes() }
    } finally {
      connection.disconnect()
    }
  }
}
