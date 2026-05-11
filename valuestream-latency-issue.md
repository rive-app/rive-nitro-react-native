# Feature Request: Synchronous callback-based property listeners in experimental API

## Problem

`ViewModelInstance.valueStream(of:)` introduces significant latency when used to track rapidly-changing animation-driven properties. A React Native pointer tracking a bouncing ball's Y position visibly trails behind the Rive animation, even when the listener callback runs on the UI thread.

## RiveRuntime version

6.20.0 (experimental API)

## Rive file

[Bouncing Ball on Rive Community](https://rive.app/community/files/25997-48571-demo-for-tracking-rive-property-in-react-native/)

The file is also at `example/assets/rive/bouncing_ball.riv` in this repo. It has a ViewModel with a `ypos` number property bound (target-to-source) to the ball's Y position.

## Root cause

The experimental API only exposes `AsyncThrowingStream`-based observation:

```swift
// Only available API for observing property changes
@MainActor final public func valueStream(of property: NumberProperty)
  -> AsyncThrowingStream<NumberProperty.Value, any Error>
```

The current listener implementation in our React Native bridge:

```swift
func addListener(onChanged: @escaping (Double) -> Void) throws -> () -> Void {
    let task = Task { @MainActor in
        let stream = self.instance.valueStream(of: self.prop)
        for try await val in stream {
            onChanged(Double(val))
        }
    }
    // ...
}
```

The `AsyncThrowingStream` + `@MainActor` Task combination means each value update goes through Swift's cooperative async executor before reaching the callback. For a 60fps animation, this scheduling overhead causes visible lag — every frame's value delivery is deferred to the next main run loop iteration (or later).

## Reproduction (pure Swift, no React Native needed)

```swift
import RiveRuntime

// Setup: load bouncing_ball.riv, create VM instance, bind to artboard
let prop = NumberProperty(path: "ypos")

// Track the latency between render and callback delivery
var lastRenderTime: CFTimeInterval = 0

// In the RiveView's advance/draw callback (synchronous, on render thread):
// lastRenderTime = CACurrentMediaTime()

// Observe via valueStream
Task { @MainActor in
    let stream = instance.valueStream(of: prop)
    for try await val in stream {
        let now = CACurrentMediaTime()
        let lag = now - lastRenderTime
        // lag is consistently > 1 frame (16.6ms), often 2-3 frames
        print("ypos=\(val) lag=\(String(format: "%.1f", lag * 1000))ms")
    }
}
```

Expected: lag < 1ms (synchronous delivery)
Actual: lag is 16-50ms (1-3 frames behind)

## What the legacy API provides

The legacy `RiveDataBindingViewModel.Instance.NumberProperty` has synchronous callbacks:

```swift
// Legacy API — synchronous, fires inline from the render loop
let listenerId: UUID = property.addListener { (value: Float) in
    // Called synchronously during the animation advance
    // No async scheduling overhead
}
property.removeListener(listenerId)
```

This has near-zero latency because the callback fires directly from the render pass.

## Requested API

Add synchronous callback-based listeners to `ViewModelInstance` for the experimental API, alongside the existing `valueStream`. Something like:

```swift
extension ViewModelInstance {
    /// Synchronous listener — callback fires inline during the animation advance.
    /// Returns a handle for removal.
    @MainActor
    func addListener<P: ValueProperty>(
        for property: P,
        _ callback: @escaping (P.Value) -> Void
    ) -> UUID

    @MainActor
    func removeListener(_ id: UUID)
}
```

Or equivalently, add `addListener`/`removeListener` directly to the property structs (matching the legacy API shape).

## Why this matters

For React Native (and likely SwiftUI too), low-latency property observation is critical for:

- **Reanimated SharedValues**: Rive animation driving native UI at 60fps via worklet listeners on the UI thread
- **Gesture-driven interactions**: User touches modifying Rive state, with UI feedback needing to be instant
- **Synchronized animations**: Rive + native animations running in lockstep

The worklet bridge infrastructure exists and works (installing Nitro's Dispatcher on Reanimated's UI runtime), but the `valueStream` async overhead negates the benefit — the bottleneck is now in the Swift async scheduling before the value even reaches JS.
