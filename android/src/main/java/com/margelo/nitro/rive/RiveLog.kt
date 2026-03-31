package com.margelo.nitro.rive

import android.util.Log

object RiveLog {
    var handler: ((String, String, String) -> Unit)? = null

    fun e(tag: String, message: String) {
        handler?.invoke("error", tag, message) ?: Log.e(tag, message)
    }

    fun w(tag: String, message: String) {
        handler?.invoke("warn", tag, message) ?: Log.w(tag, message)
    }

    fun i(tag: String, message: String) {
        handler?.invoke("info", tag, message) ?: Log.i(tag, message)
    }

    fun d(tag: String, message: String) {
        handler?.invoke("debug", tag, message) ?: Log.d(tag, message)
    }
}
