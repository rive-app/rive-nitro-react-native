package com.margelo.nitro.rive

sealed class DataLoaderException(message: String) : Exception(message) {
  object InvalidSource : DataLoaderException("Invalid data source type for this loader")
  class InvalidURL(url: String) : DataLoaderException("Invalid URL: $url")
  class HttpError(val statusCode: Int, url: String) :
    DataLoaderException("HTTP error $statusCode for $url")
  class ResourceNotFound(resource: String) : DataLoaderException("Resource not found: $resource")
  class FileNotFound(path: String) : DataLoaderException("File not found: $path")
  object NoContext : DataLoaderException("No application context available")
}

interface DataLoader {
  suspend fun load(source: DataSource): ByteArray
}
