package com.rive

import android.content.Context
import app.rive.runtime.kotlin.core.Rive

object RiveInitializer {
    @Volatile
    private var isInitialized = false

    @Synchronized
    fun init(context: Context) {
        if (!isInitialized) {
            Rive.init(context) // TODO: this should use the updated init method when the new android version is released. That version contains contains a flag to not use relinker and rework the order. For now, let's expose a way to hanle init in React Native with user level control
            isInitialized = true
        }
    }
}
