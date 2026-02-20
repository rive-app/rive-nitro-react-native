package com.rive

import android.content.Context
import android.util.Log
import app.rive.runtime.kotlin.core.Rive

object RiveInitializer {
    private const val TAG = "RiveInitializer"

    @Volatile
    var isInitialized = false
        private set

    @Volatile
    var error: String? = null
        private set

    private var context: Context? = null

    fun storeContext(ctx: Context) {
        context = ctx.applicationContext
    }

    @Synchronized
    fun autoInitialize(ctx: Context): Boolean {
        storeContext(ctx)
        if (isInitialized) return true
        return try {
            Rive.init(ctx)
            isInitialized = true
            error = null
            true
        } catch (e: Throwable) {
            error = formatError(e)
            Log.e(TAG, "Auto-init failed: $error", e)
            false
        }
    }

    @Synchronized
    fun manualInitialize() {
        val ctx = context
        if (ctx == null) {
            error = "Context not available. Ensure RivePackage is registered."
            Log.e(TAG, "Manual init failed: $error")
            return
        }
        if (isInitialized) return
        try {
            Rive.init(ctx)
            isInitialized = true
            error = null
        } catch (e: Throwable) {
            error = formatError(e)
            Log.e(TAG, "Manual init failed: $error", e)
        }
    }

    private fun formatError(e: Throwable): String {
        val name = e::class.simpleName ?: "Unknown"
        val msg = e.message ?: e.toString()
        return "$name: $msg"
    }
}
