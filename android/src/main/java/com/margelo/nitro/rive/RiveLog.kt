package com.margelo.nitro.rive

import android.util.Log

enum class RiveLogLevel(val priority: Int) {
    DEBUG(0),
    INFO(1),
    WARN(2),
    ERROR(3),
    ;

  companion object {
        fun fromString(level: String): RiveLogLevel? = when (level) {
            "debug" -> DEBUG
            "info" -> INFO
            "warn" -> WARN
            "error" -> ERROR
            else -> null
        }
    }
}

object RiveLog {
    var handler: ((String, String, String) -> Unit)? = null
    var minLevel: RiveLogLevel = RiveLogLevel.WARN

    fun e(tag: String, message: String) {
        if (RiveLogLevel.ERROR.priority < minLevel.priority) return
        handler?.invoke("error", tag, message) ?: Log.e(tag, message)
    }

    fun w(tag: String, message: String) {
        if (RiveLogLevel.WARN.priority < minLevel.priority) return
        handler?.invoke("warn", tag, message) ?: Log.w(tag, message)
    }

    fun i(tag: String, message: String) {
        if (RiveLogLevel.INFO.priority < minLevel.priority) return
        handler?.invoke("info", tag, message) ?: Log.i(tag, message)
    }

    fun d(tag: String, message: String) {
        if (RiveLogLevel.DEBUG.priority < minLevel.priority) return
        handler?.invoke("debug", tag, message) ?: Log.d(tag, message)
    }
}
