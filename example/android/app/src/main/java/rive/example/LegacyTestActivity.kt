package rive.example

import android.os.Bundle
import android.util.Log
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import app.rive.runtime.kotlin.RiveAnimationView
import app.rive.runtime.kotlin.core.Rive as RiveLegacy

class LegacyTestActivity : AppCompatActivity() {
    private var riveView: RiveAnimationView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d("LegacyRiveTest", "LegacyTestActivity.onCreate")

        RiveLegacy.init(this)

        val container = FrameLayout(this)
        riveView = RiveAnimationView(this).apply {
            setRiveResource(R.raw.click_count)
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }
        container.addView(riveView)
        setContentView(container)

        Log.d("LegacyRiveTest", "RiveAnimationView set up with rating.riv")
    }

    override fun onDestroy() {
        super.onDestroy()
        // riveView cleanup handled by framework
    }
}
