package com.margelo.nitro.rive

import android.net.Uri
import java.net.URI

object DataSourceResolver {
  fun resolve(asset: ResolvedReferencedAsset): DataSource? {
    asset.sourceUrl?.let { return resolveFromUrl(it) }
    asset.sourceAssetId?.let { return resolveFromAssetId(it) }
    asset.sourceAsset?.let { return resolveFromSourceAsset(it) }
    return null
  }

  private fun resolveFromUrl(urlString: String): DataSource? {
    val uri = runCatching { URI(urlString) }.getOrNull() ?: return null

    return when (uri.scheme) {
      "file" -> uri.path?.let { DataSource.File(it) }
      "http", "https" -> DataSource.Http(urlString)
      else -> null
    }
  }

  private fun resolveFromAssetId(assetId: String): DataSource? {
    val scheme = runCatching { Uri.parse(assetId).scheme }.getOrNull()

    if (scheme != null) {
      return resolveFromUrl(assetId)
    }

    return DataSource.Resource(assetId)
  }

  private fun resolveFromSourceAsset(sourceAsset: String): DataSource {
    val name = sourceAsset.substringBeforeLast(".")
    return DataSource.Resource(name)
  }
}
