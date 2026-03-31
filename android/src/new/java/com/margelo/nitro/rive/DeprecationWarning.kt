package com.margelo.nitro.rive

object DeprecationWarning {
    private val warned = mutableSetOf<String>()

    fun warn(method: String, replacement: String) {
        if (warned.add(method)) {
            RiveLog.w("Deprecation",
                "'$method' is deprecated and blocks the calling thread. Use '$replacement' instead.")
        }
    }
}
