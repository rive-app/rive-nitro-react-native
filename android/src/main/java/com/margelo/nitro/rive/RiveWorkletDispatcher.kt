package com.margelo.nitro.rive

import android.os.Handler
import android.os.Looper
import androidx.annotation.Keep
import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import java.util.concurrent.atomic.AtomicBoolean

@Suppress("JavaJniMissingFunction")
@Keep
@DoNotStrip
class RiveWorkletDispatcher {
    @DoNotStrip
    @Suppress("unused")
    private val mHybridData: HybridData = initHybrid()

    private val mainHandler = Handler(Looper.getMainLooper())
    private val active = AtomicBoolean(true)

    private val triggerRunnable = Runnable {
        synchronized(active) {
            if (active.get()) {
                trigger()
            }
        }
    }

    private external fun initHybrid(): HybridData
    private external fun trigger()

    @DoNotStrip
    @Suppress("unused")
    private fun scheduleTrigger() {
        mainHandler.post(triggerRunnable)
    }

    fun deactivate() {
        synchronized(active) {
            active.set(false)
        }
    }

    companion object {
        init {
            System.loadLibrary("rive")
        }
    }
}
