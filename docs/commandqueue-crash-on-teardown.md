# CommandQueue use-after-free crash on view teardown

## Summary

When using the experimental `@_spi(RiveExperimental)` API with data binding, navigating away from a screen that contains a `RiveUIView` causes a crash in `rive::CommandQueue::processMessages()`. This is a use-after-free — the CADisplayLink fires after the underlying C++ objects have been deallocated.

## Crash signature

```
Thread 1: EXC_BAD_ACCESS (code=1, address=0xbeadde99d448)

#0  rive::CommandQueue::processMessages()
#1  CA::Display::DisplayLinkItem::dispatch_()
#2  CA::Display::DisplayLink::dispatch_items()
#3  CA::Display::DisplayLink::dispatch_deferred_display_links()
#4  _UIUpdateSequenceRun()
...
```

The faulting address (`0xbeadde99d448`) looks like a poison/sentinel value, consistent with accessing already-freed memory.

## Steps to reproduce (native-only, no React Native needed)

1. Create a `Worker` and load a `.riv` file with data binding (ViewModels)
2. Create an artboard + state machine + `ViewModelInstance`
3. Create a `Rive` instance with `dataBind` and embed it in a `RiveUIView`
4. Add the `RiveUIView` to the view hierarchy (this starts the internal CADisplayLink)
5. Interact with a ViewModel property (e.g. set a string value)
6. Remove the `RiveUIView` from the hierarchy and release all references (`Rive`, `ViewModelInstance`, `Worker`, `File`)
7. Crash occurs on the next display link tick

Minimal Swift reproduction:

```swift
import UIKit
@_spi(RiveExperimental) import RiveRuntime

class ViewController: UIViewController {
    var worker: Worker?
    var file: File?
    var riveInstance: Rive?
    var riveView: RiveUIView?

    override func viewDidLoad() {
        super.viewDidLoad()

        Task { @MainActor in
            let worker = await Worker()
            let data = try Data(contentsOf: Bundle.main.url(forResource: "databinding", withExtension: "riv")!)
            let file = try await File(source: .data(data), worker: worker)
            let artboard = try await file.createArtboard(nil)
            let stateMachine = try await artboard.createStateMachine(nil)
            let vmi = try await file.createViewModelInstance(
                .viewModelDefault(from: .artboardDefault(artboard))
            )

            // Set a property value
            let nameProp = StringProperty(path: "name")
            vmi.setValue(of: nameProp, to: "Hello")

            let rive = try await Rive(
                file: file,
                artboard: artboard,
                stateMachine: stateMachine,
                dataBind: .viewModelInstance(vmi)
            )

            let rv = RiveUIView(rive)
            rv.frame = view.bounds
            view.addSubview(rv)

            self.worker = worker
            self.file = file
            self.riveInstance = rive
            self.riveView = rv
        }
    }

    func teardownRive() {
        // This triggers the crash on the next display link tick
        riveView?.removeFromSuperview()
        riveView = nil
        riveInstance = nil
        file = nil
        worker = nil
        // --> EXC_BAD_ACCESS in rive::CommandQueue::processMessages()
    }
}
```

Call `teardownRive()` (e.g. via a button or navigation pop) after the view has rendered at least one frame.

## What's happening

The object ownership and teardown order:

```
RiveUIView
  └─ internal CADisplayLink (fires every frame)
       └─ calls artboard.advance()
            └─ rive::CommandQueue::processMessages()

Worker
  └─ CommandServer (background serial queue)
       └─ C++ Artboard, StateMachine, ViewModelInstance objects
```

When we nil out the references:
1. `RiveUIView` is removed from superview
2. `Rive` instance is deallocated → artboard/stateMachine C++ objects get freed
3. But the **CADisplayLink may have already been scheduled** for the current run loop iteration
4. The display link callback fires → `processMessages()` reads from the freed `CommandQueue` → crash

The core issue: the CADisplayLink's callback is dispatched as a run loop source. If teardown happens mid-runloop (e.g. during a UIKit navigation transition), the display link fires *after* the C++ objects are freed but *before* the display link itself is invalidated.

## Expected fix

The `RiveUIView` (or `Rive`) deinit should **synchronously invalidate the CADisplayLink** before releasing the underlying C++ objects. Something like:

```swift
// Inside RiveUIView or Rive deinit:
displayLink.invalidate()  // Must happen BEFORE C++ objects are freed
// Now safe to release artboard, stateMachine, commandQueue
```

Or alternatively, the `CommandQueue` destructor could drain/flush pending messages and mark itself as invalid so `processMessages()` becomes a no-op after deallocation begins.

## Environment

- rive-ios: 6.15.0+ (SPM, experimental API)
- iOS 17+
- Crash is 100% reproducible when data binding is used
- Does NOT occur with the legacy (CocoaPods) `RiveRuntime` API
