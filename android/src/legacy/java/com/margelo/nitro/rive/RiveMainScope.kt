package com.margelo.nitro.rive

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

// Legacy runtime objects are only safe to touch on the main thread: the
// attached views render there and rive-android's legacy API has no internal
// synchronization (off-main access is the race class of issue #297). This
// scope hops *Async calls onto main. It is intentionally never cancelled —
// a Promise launched on a cancelled scope would never settle, so bodies
// guard on disposed state instead.
internal val riveMainScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
