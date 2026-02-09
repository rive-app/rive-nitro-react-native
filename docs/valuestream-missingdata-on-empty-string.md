# valueStream throws `missingData` when nested property is set to empty string

## Summary

When using the experimental `@_spi(RiveExperimental)` API, setting a nested ViewModel string property to an empty string (`""`) causes the `valueStream` to throw a `missingData` error. This terminates the `AsyncThrowingStream`, killing the listener permanently.

## Crash / error signature

```
[StringProperty] listener stream error: missingData
```

Stack trace originates from `instance.valueStream(of: prop)` iteration via `for try await val in stream`.

## Steps to reproduce (native-only)

1. Load a `.riv` file that has a ViewModel with nested ViewModels (e.g. a root VM with a child VM that has a `name: String` property)
2. Create a `ViewModelInstance` from the file
3. Get a `StringProperty` for a nested path (e.g. `"childVm/name"`)
4. Start listening via `valueStream`
5. Set the property value to an empty string `""`
6. The stream throws `missingData` and terminates

```swift
import UIKit
@_spi(RiveExperimental) import RiveRuntime

// Assuming a .riv file with:
//   RootViewModel
//     └─ childVm: ChildViewModel
//          └─ name: String (default: "Hello")

let worker = await Worker()
let data = try Data(contentsOf: Bundle.main.url(forResource: "viewmodelproperty", withExtension: "riv")!)
let file = try await File(source: .data(data), worker: worker)
let artboard = try await file.createArtboard(nil)
let vmi = try await file.createViewModelInstance(
    .viewModelDefault(from: .artboardDefault(artboard))
)

let nameProp = StringProperty(path: "childVm/name")

// Start listening
Task { @MainActor in
    let stream = vmi.valueStream(of: nameProp)
    do {
        for try await val in stream {
            print("Value: '\(val)'")
        }
        print("Stream ended normally")
    } catch {
        // THIS IS HIT: "missingData"
        print("Stream error: \(error)")
    }
}

// Wait a moment for the listener to start
try await Task.sleep(nanoseconds: 500_000_000)

// Set to a non-empty value — works fine, listener receives "World"
vmi.setValue(of: nameProp, to: "World")

try await Task.sleep(nanoseconds: 500_000_000)

// Set to empty string — stream throws missingData and terminates
vmi.setValue(of: nameProp, to: "")

// Output:
// Value: 'Hello'    (initial)
// Value: 'World'    (after first set)
// Stream error: missingData    (after setting to "")
//
// Listener is now DEAD — further setValue calls are not observed
```

## Expected behavior

Setting a string property to `""` should emit `""` through the stream, not throw `missingData`. An empty string is a valid value — it is not "missing data".

## Actual behavior

The `valueStream` throws `missingData`, which terminates the `AsyncThrowingStream`. The listener is permanently dead and cannot receive any further updates, even if the property is later set to a non-empty value.

## Impact

- Any UI bound to a nested ViewModel string property becomes unresponsive after clearing the field
- The listener cannot recover without being re-created (which requires disposing and re-subscribing)
- Affects `StringProperty` on nested paths — not confirmed on top-level properties

## Current workaround

We wrap the stream iteration in a retry loop that catches the error and restarts the stream after a 100ms delay:

```swift
while !Task.isCancelled {
    let stream = instance.valueStream(of: prop)
    do {
        for try await val in stream {
            onChanged(val)
        }
        break
    } catch {
        // missingData on empty nested property — restart stream
        try? await Task.sleep(nanoseconds: 100_000_000)
    }
}
```

This keeps the listener alive but introduces a brief gap where updates can be missed.

## Environment

- rive-ios: 6.15.0+ (SPM, `@_spi(RiveExperimental)`)
- Nested ViewModel property paths (e.g. `"childVm/name"`)
- Setting value to empty string `""`
