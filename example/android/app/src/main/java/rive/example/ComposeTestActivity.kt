package rive.example

import android.os.Bundle
import android.util.Log
import android.view.MotionEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import app.rive.Fit
import app.rive.Rive
import app.rive.RiveFileSource
import app.rive.RivePointerInputMode
import app.rive.rememberArtboard
import app.rive.rememberRiveFile
import app.rive.rememberRiveWorker
import app.rive.rememberStateMachine
import app.rive.Result
import app.rive.RiveLog

class ComposeTestActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d("ComposeRiveTest", "ComposeTestActivity.onCreate")
        RiveLog.logger = RiveLog.LogcatLogger()

        // Use legacy API to inspect the .riv file structure
        inspectRivFile()

        setContent {
            RiveContent()
        }
    }

    private fun inspectRivFile() {
        try {
            // Inspect both files
            inspectFile("touchevents", R.raw.touchevents)
            inspectFile("off_road_car", R.raw.off_road_car_blog)
            inspectFile("touchpassthrough", R.raw.touchpassthrough)
        } catch (e: Exception) {
            Log.e("ComposeRiveTest", "Legacy inspect failed", e)
        }
    }

    private fun inspectFile(label: String, resId: Int) {
        try {
            val bytes = resources.openRawResource(resId).readBytes()
            Log.d("ComposeRiveTest", "[$label] File size: ${bytes.size} bytes")

            val legacyFile = app.rive.runtime.kotlin.core
              .File(bytes)
            val artboard = legacyFile.firstArtboard
            Log.d("ComposeRiveTest", "[$label] artboard: name=${artboard.name} w=${artboard.bounds.width()} h=${artboard.bounds.height()}")
            Log.d("ComposeRiveTest", "[$label] SM count: ${artboard.stateMachineCount}")

            for (i in 0 until artboard.stateMachineCount) {
                val smi = artboard.stateMachine(i)
                Log.d("ComposeRiveTest", "[$label] SM[$i]: inputCount=${smi.inputCount}")
                for (j in 0 until smi.inputCount) {
                    val input = smi.input(j)
                    Log.d(
                      "ComposeRiveTest",
                      "[$label]   input[$j]: name=${input.name} isBoolean=${input.isBoolean} isTrigger=${input.isTrigger} isNumber=${input.isNumber}"
                    )
                }
            }
            // Skip release — legacy API has lifecycle issues in this context
        } catch (e: Exception) {
            Log.e("ComposeRiveTest", "[$label] inspect failed", e)
        }
    }

    override fun dispatchTouchEvent(ev: MotionEvent?): Boolean {
        Log.d("ComposeRiveTest", "dispatchTouchEvent: action=${ev?.actionMasked} x=${ev?.x} y=${ev?.y}")
        return super.dispatchTouchEvent(ev)
    }
}

@Composable
fun RiveContent() {
    val context = LocalContext.current
    val worker = rememberRiveWorker()
    val source = RiveFileSource.RawRes(R.raw.touchevents, context.resources)
    val fileResult = rememberRiveFile(source, worker)

    when (fileResult) {
        is Result.Loading -> {
            Log.d("ComposeRiveTest", "RiveFile loading...")
        }
        is Result.Error -> {
            Log.e("ComposeRiveTest", "RiveFile error: ${fileResult.throwable}")
        }
        is Result.Success -> {
            Log.d("ComposeRiveTest", "RiveFile loaded successfully")
            val file = fileResult.value
            val artboard = rememberArtboard(file)
            val stateMachine = rememberStateMachine(artboard)

            LaunchedEffect(stateMachine) {
                Log.d(
                  "ComposeRiveTest",
                  "artboard=${artboard.artboardHandle} sm=${stateMachine.stateMachineHandle} name=${artboard.name} smName=${stateMachine.name}"
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .pointerInput(Unit) {
                        awaitPointerEventScope {
                            while (true) {
                                val event = awaitPointerEvent()
                                Log.d("ComposeRiveTest", "Compose pointerEvent: type=${event.type} changes=${event.changes.size}")
                            }
                        }
                    }
            ) {
                Rive(
                    file = file,
                    modifier = Modifier.fillMaxSize(),
                    artboard = artboard,
                    stateMachine = stateMachine,
                    fit = Fit.Contain(),
                    pointerInputMode = RivePointerInputMode.Consume,
                )
            }
        }
    }
}
