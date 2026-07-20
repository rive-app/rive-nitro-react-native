package com.margelo.nitro.rive

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip

@Keep
@DoNotStrip
class HybridRiveLogger : HybridRiveLoggerSpec() {
    override fun setHandler(handler: (level: String, tag: String, message: String) -> Unit) {
        RiveLog.handler = handler
    }

    override fun resetHandler() {
        RiveLog.handler = null
    }

    override fun setLogLevel(level: String) {
        val parsed = RiveLogLevel.fromString(level)
            ?: throw RuntimeException("Invalid log level '$level'. Use: debug, info, warn, error")
        RiveLog.minLevel = parsed
    }
}
