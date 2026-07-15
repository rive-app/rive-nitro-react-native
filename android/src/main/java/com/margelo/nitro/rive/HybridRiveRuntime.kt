package com.margelo.nitro.rive

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import com.rive.RiveInitializer
import com.rive.RiveRenderBackendConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Keep
@DoNotStrip
class HybridRiveRuntime : HybridRiveRuntimeSpec() {
    override fun initialize(): Promise<Unit> {
        return Promise.async {
            withContext(Dispatchers.Main) {
                RiveInitializer.manualInitialize()
            }
        }
    }

    override val isInitialized: Boolean
        get() = RiveInitializer.isInitialized

    override val initError: String?
        get() = RiveInitializer.error

    override fun setAndroidRenderBackend(backend: AndroidRenderBackend) {
        RiveRenderBackendConfig.set(backend)
    }
}
