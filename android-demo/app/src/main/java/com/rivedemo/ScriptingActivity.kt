package com.rivedemo

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import app.rive.Fit
import app.rive.Rive
import app.rive.RiveFileSource
import app.rive.RivePointerInputMode
import app.rive.rememberArtboard
import app.rive.rememberRiveFile
import app.rive.rememberRiveWorker
import app.rive.rememberStateMachine
import app.rive.rememberViewModelInstance
import app.rive.Result
import app.rive.RiveLog

private const val TAG = "ScriptingActivity"

class ScriptingActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        System.loadLibrary("rive-android")
        RiveLog.logger = RiveLog.LogcatLogger()

        setContent {
            ScriptingContent()
        }
    }
}

@Composable
fun ScriptingContent() {
    val context = LocalContext.current
    val worker = rememberRiveWorker()
    val source = RiveFileSource.RawRes(R.raw.blinko, context.resources)
    val fileResult = rememberRiveFile(source, worker)

    when (fileResult) {
        is Result.Loading -> {
            Log.d(TAG, "Loading blinko.riv...")
        }
        is Result.Error -> {
            Log.e(TAG, "Failed to load blinko.riv", fileResult.throwable)
        }
        is Result.Success -> {
            val file = fileResult.value
            val artboard = rememberArtboard(file)
            val stateMachine = rememberStateMachine(artboard)
            val vmi = rememberViewModelInstance(file)

            Box(modifier = Modifier.fillMaxSize()) {
                Rive(
                    file = file,
                    modifier = Modifier.fillMaxSize(),
                    artboard = artboard,
                    stateMachine = stateMachine,
                    viewModelInstance = vmi,
                    fit = Fit.Contain(),
                    playing = true,
                    pointerInputMode = RivePointerInputMode.Consume,
                )
            }
        }
    }
}
