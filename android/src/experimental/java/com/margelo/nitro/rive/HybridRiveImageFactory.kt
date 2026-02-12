package com.margelo.nitro.rive

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise

@Keep
@DoNotStrip
class HybridRiveImageFactory : HybridRiveImageFactorySpec() {

  private fun loadFromDataSource(source: DataSource): Promise<HybridRiveImageSpec> {
    return Promise.async {
      val loader = source.createLoader()
      val data = loader.load(source)
      HybridRiveImage(data)
    }
  }

  override fun loadFromURLAsync(url: String): Promise<HybridRiveImageSpec> {
    return loadFromDataSource(DataSource.fromURL(url))
  }

  override fun loadFromResourceAsync(resource: String): Promise<HybridRiveImageSpec> {
    return loadFromDataSource(DataSource.resource(resource))
  }

  override fun loadFromBytesAsync(bytes: ArrayBuffer): Promise<HybridRiveImageSpec> {
    return loadFromDataSource(DataSource.Bytes.from(bytes))
  }
}
