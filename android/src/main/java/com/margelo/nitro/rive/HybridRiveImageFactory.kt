package com.margelo.nitro.rive

import androidx.annotation.Keep
import app.rive.runtime.kotlin.core.RiveRenderImage
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

@Keep
@DoNotStrip
class HybridRiveImageFactory : HybridRiveImageFactorySpec() {

  override fun loadFromURLAsync(url: String): Promise<HybridRiveImageSpec> {
    return Promise.async {
      try {
        val (imageData, dataSize) = withContext(Dispatchers.IO) {
          val urlObj = URL(url)
          val connection = urlObj.openConnection() as HttpURLConnection

          try {
            connection.requestMethod = "GET"
            val statusCode = connection.responseCode

            if (statusCode !in 200..299) {
              throw Exception("Failed to load image from URL: $url (status: $statusCode)")
            }

            val bytes = connection.inputStream.use { it.readBytes() }
            Pair(bytes, bytes.size)
          } finally {
            connection.disconnect()
          }
        }

        val renderImage = RiveRenderImage.fromEncoded(imageData)

        HybridRiveImage(renderImage, dataSize)
      } catch (e: Exception) {
        throw Exception("Failed to load image from URL: $url - ${e.message}")
      }
    }
  }
}
