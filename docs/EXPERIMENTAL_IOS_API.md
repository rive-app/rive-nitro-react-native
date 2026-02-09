# Rive iOS Experimental API: Architecture & Threading

This document explains the architectural differences between the legacy and experimental iOS Rive APIs, focusing on why async is required and implications for React Native bindings.

## Overview

The experimental iOS API (`@_spi(RiveExperimental)`) introduces a fundamentally different threading model compared to the legacy API. This affects how we access ViewModel property values.

| Aspect | Legacy iOS API | Experimental iOS API | Android SDK |
|--------|---------------|---------------------|-------------|
| Property value read | **Sync** | **Async only** | **Sync** |
| Property value write | Sync | Sync | Sync |
| File operations | Sync (mostly) | Async | Async |
| Thread model | Main thread | Worker + Main thread | Main thread |

## Why Async is Required in Experimental API

### The Worker Architecture

The experimental API introduces a `Worker` that manages a **dedicated background thread** for Rive processing:

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Thread (@MainActor)                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  SwiftUI /  │    │   Nitro     │    │   React     │     │
│  │   UIKit     │    │  Bindings   │    │   Native    │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                    ┌───────▼───────┐                        │
│                    │ Command Queue │  (async boundary)      │
│                    └───────┬───────┘                        │
└────────────────────────────┼────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    Background Thread                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     Worker                           │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │   File   │  │ Artboard │  │ ViewModelInstance│  │   │
│  │  │Processing│  │ Rendering│  │   Value Storage  │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

From the [Rive Apple documentation](https://rive.app/docs/runtimes/apple/apple):

> "A Worker is what handles concurrency in the Rive runtime. This type handles starting a background thread for processing, in addition to handling global (out-of-band) assets."

### Why Property Values Live on Background Thread

Property values are stored in `ViewModelInstance` objects managed by the Worker on the background thread. When you request a value:

1. Request sent from Main Thread → Command Queue
2. Command Queue dispatches to Worker (background thread)
3. Worker reads value from ViewModelInstance
4. Value returned via AsyncSequence/Stream back to Main Thread

This separation exists because:
- **Heavy computation** (file parsing, artboard rendering, animation) happens on background thread
- **UI interactions** must happen on main thread (SwiftUI/UIKit requirement)
- **Thread safety** is enforced at compile time via `@MainActor` annotations

### The Async Value Access API

The experimental API provides **two** methods for reading values:

```swift
// 1. ONE-SHOT ASYNC - get current value once
let currentValue = try await viewModelInstance.value(of: numberProperty)

// 2. STREAM - continuous updates (AsyncThrowingStream)
let stream = viewModelInstance.valueStream(of: numberProperty)
for try await value in stream {
    print(value)  // Fires on every change
}

// Writing - SYNC (fire and forget to command queue)
viewModelInstance.setValue(of: numberProperty, to: 42.0)
```

**Key insight**: There IS a one-shot `value(of:)` async method - not just streams! Our current implementation only uses streams, but we could use `value(of:)` for initial fetch.

## Comparison: Legacy vs Experimental

### Legacy iOS Implementation

```swift
// ios/legacy/HybridViewModelNumberProperty.swift
class HybridViewModelNumberProperty: HybridViewModelNumberPropertySpec {
    var property: NumberPropertyType!

    var value: Double {
        get { Double(property.value) }  // ✅ SYNC - direct memory access
        set { property.value = Float(newValue) }
    }
}
```

The legacy API stores values in objects directly accessible on the main thread.

### Experimental iOS Implementation

```swift
// ios/new/HybridViewModelNumberProperty.swift
class HybridViewModelNumberProperty: HybridViewModelNumberPropertySpec {
    private let instance: ViewModelInstance
    private let prop: NumberProperty
    private var cachedValue: Float = 0  // ⚠️ Starts as 0, not real value!

    init(instance: ViewModelInstance, path: String) {
        self.instance = instance
        self.prop = NumberProperty(path: path)
        startCacheStream()  // Async stream updates cachedValue
    }

    var value: Double {
        get { Double(cachedValue) }  // ⚠️ Returns cached, may be stale/default
        set { /* fires async Task to setValue */ }
    }
}
```

**Problem**: On first access, `cachedValue` is `0` (the default), not the actual value. The real value arrives asynchronously via the stream.

### Android Implementation (for reference)

```kotlin
// Android has sync access like legacy iOS
class HybridViewModelNumberProperty(private val viewModelNumber: ViewModelNumberProperty) {
    override var value: Double
        get() = viewModelNumber.value.toDouble()  // ✅ SYNC
        set(value) { viewModelNumber.value = value.toFloat() }
}
```

## Can We Make Sync Access Work?

### Threading Context: JS vs iOS Main Thread

**Important**: The JS thread is **separate** from the iOS main thread. This means:
- Blocking JS while waiting for iOS async is **safe** (no deadlock)
- Nitro's `Promise` mechanism handles this cross-thread communication

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    JS Thread    │     │  iOS Main Thread │     │  Worker Thread  │
│                 │     │   (@MainActor)   │     │                 │
│  await getValue │────►│  Promise.async   │────►│  value(of:)     │
│  (blocks here)  │     │  { try await     │     │  returns value  │
│                 │◄────│    value(of:)    │◄────│                 │
│  continues...   │     │  }               │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Option 1: Block iOS Main Thread ❌

```swift
var value: Double {
    get {
        // DON'T DO THIS - blocks iOS main thread!
        let semaphore = DispatchSemaphore(value: 0)
        var result: Double = 0
        Task {
            result = try await instance.value(of: prop)
            semaphore.signal()
        }
        semaphore.wait()  // ❌ DEADLOCK - main thread waiting for main thread
        return result
    }
}
```

**Why it fails**: The async call needs to complete on `@MainActor`. If we block the iOS main thread, we deadlock.

### Option 2: Async Getter with Nitro Promise ✅ (Recommended)

Use Nitro's `Promise.async` to bridge Swift async to JS Promise:

```swift
// Swift - use value(of:) one-shot async
func getValue() throws -> Promise<Double> {
    return Promise.async { [self] in
        try await self.instance.value(of: self.prop)
    }
}
```

```typescript
// Nitro spec
interface ViewModelNumberProperty {
    getValue(): Promise<number>;  // Async getter
    value: number;                // Sync setter (cached value for writes)
    // ... listeners
}
```

```typescript
// JS usage - blocks JS thread until value returns
const currentValue = await property.getValue();
```

**Benefits**:
- No deadlock - JS thread blocks, iOS main thread free to process
- Clean API - explicit async
- One-shot fetch using `value(of:)` - no stream overhead

### Option 3: Async Property Getter ✅ (Alternative)

Make the property getter itself async:

```typescript
// Nitro spec
interface ViewModelInstance {
    numberProperty(path: string): Promise<NumberProperty | undefined>;
}
```

```swift
// Swift - fetch initial value before returning property
func numberProperty(path: String) throws -> Promise<(any HybridViewModelNumberPropertySpec)?> {
    return Promise.async { [self] in
        let prop = NumberProperty(path: path)
        let initialValue = try await self.viewModelInstance.value(of: prop)
        return HybridViewModelNumberProperty(
            instance: self.viewModelInstance,
            path: path,
            initialValue: initialValue
        )
    }
}
```

**Trade-offs**:
- Property is "ready" when returned (has initial value)
- Adds latency to property access
- Hook must handle the Promise
- Cleaner than nullable values in the property itself

### Option 4: Accept Nullable Values ⚠️ (Simpler but UX tradeoff)

```typescript
// Nitro spec
interface ViewModelNumberProperty {
    value: number | undefined;  // undefined until first stream value
    addListener(onChanged: (value: number) => void): () => void;
}
```

```swift
// iOS implementation
class HybridViewModelNumberProperty {
    private var cachedValue: Float?  // nil until stream delivers
    private var hasReceivedValue = false

    var value: Double? {
        get { hasReceivedValue ? Double(cachedValue!) : nil }
    }
}
```

**Benefits**:
- Honest API - reflects the async reality
- No blocking or hacks
- React hooks already handle `undefined` (loading state)
- Consistent pattern: `undefined` → actual value

## Impact on React Native Hooks

### Current Behavior (Problematic)

```typescript
const { value } = useRiveNumber('score', vmi);
// First render: value = 0 (wrong! it's the Swift default, not the real value)
// After stream: value = 42 (correct)
```

User sees a flash: `0` → `42`

### With Nullable Values (Recommended)

```typescript
const { value } = useRiveNumber('score', vmi);
// First render: value = undefined (loading)
// After stream: value = 42 (correct)

// User code handles loading:
if (value === undefined) return <Loading />;
return <Score value={value} />;
```

This is the same pattern as `useQuery`, `useSWR`, and other async data hooks.

## Recommendations

### Option A: Add Async Getter (Recommended)

**Nitro Spec:**
```typescript
interface ViewModelNumberProperty {
    getValue(): Promise<number>;  // NEW: async one-shot getter
    value: number;                // Keep for setter (writes to cache, fires async setValue)
    addListener(onChanged: (value: number) => void): () => void;
}
```

**iOS Implementation:**
```swift
func getValue() throws -> Promise<Double> {
    return Promise.async { [self] in
        try await self.instance.value(of: self.prop)  // Use one-shot async!
    }
}
```

**Hook Usage:**
```typescript
function useRiveNumber(path: string, vmi: ViewModelInstance) {
    const [value, setValue] = useState<number | undefined>();
    const property = useMemo(() => vmi?.numberProperty(path), [vmi, path]);

    useEffect(() => {
        if (!property) return;
        // Fetch initial value
        property.getValue().then(setValue);
        // Subscribe to updates
        return property.addListener(setValue);
    }, [property]);

    return { value, setValue: (v) => property.value = v };
}
```

### Option B: Async Property Getter (More Invasive)

**Nitro Spec:**
```typescript
interface ViewModelInstance {
    numberProperty(path: string): Promise<NumberProperty | undefined>;
}
```

**Trade-off**: Property returned with initial value already loaded, but every property access is async.

### For React Hooks

With Option A, hooks return `undefined` initially until `getValue()` resolves. This is a familiar pattern (like `useQuery`). The hook can expose `isLoading`:

```typescript
{ value: number | undefined, setValue, error, isLoading: boolean }
```

## Summary

| Question | Answer |
|----------|--------|
| Why is async needed? | Worker runs on background thread; values must cross thread boundary |
| Can we block iOS main thread? | No - would deadlock (`@MainActor` delivery) |
| Can we block JS thread? | **Yes!** JS thread is separate from iOS main thread |
| Best approach? | Add `getValue(): Promise<number>` using `value(of:)` one-shot async |
| Alternative? | Make `numberProperty(path)` async, return property with initial value |
| Android affected? | No - Android SDK has sync value access |
| Legacy iOS affected? | No - Legacy has sync value access |

## Key Findings

1. **`value(of:)` exists!** - The experimental API has a one-shot async getter, not just streams. Our current implementation only uses `valueStream(of:)`.

2. **JS blocking is safe** - The JS thread is separate from iOS main thread. Blocking JS while awaiting iOS async won't deadlock.

3. **Recommended approach**: Add `getValue(): Promise<number>` to the Nitro spec. Uses `value(of:)` under the hood. Hooks can `await` this on mount.

## Deep Dive: Property Read Implementation (iOS → C++)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Swift Layer (Main Thread / @MainActor)                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ViewModelInstance.swift                                              │   │
│  │ value(of:) / valueStream(of:) → delegates to service                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ViewModelInstanceService.swift                                       │   │
│  │ Stores continuations, calls commandQueue.requestViewModelInstance*   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  Objective-C++ Bridge (Main Thread)                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ RiveCommandQueue.mm                                                  │   │
│  │ assert([NSThread isMainThread]) - enforces main thread               │   │
│  │ Converts ObjC → C++ types, queues commands                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  C++ Layer (Background Thread via CommandServer)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ RiveCommandServer.mm - runs on background serial dispatch queue      │   │
│  │ rive::CommandServer processes commands from queue                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ↓                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ viewmodel_instance_number_runtime.hpp / .cpp                         │   │
│  │ float value() const / void value(float) - NO thread safety!         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### GitHub Source Links

**Swift Layer:**
- [`ViewModelInstance.swift`](https://github.com/rive-app/rive-ios/blob/main/Source/Experimental/DataBinding/ViewModelInstance.swift) - Entry point for `value(of:)` and `valueStream(of:)`
- [`ViewModelInstanceService.swift`](https://github.com/rive-app/rive-ios/blob/main/Source/Experimental/DataBinding/ViewModelInstanceService.swift) - Manages continuations, bridges to command queue

**Objective-C++ Bridge:**
- [`RiveCommandQueue.h`](https://github.com/rive-app/rive-ios/blob/main/Source/Experimental/CommandQueue/RiveCommandQueue.h)
- [`RiveCommandQueue.mm`](https://github.com/rive-app/rive-ios/blob/main/Source/Experimental/CommandQueue/RiveCommandQueue.mm) - Main thread enforcement, ObjC→C++ conversion
- [`RiveCommandServer.mm`](https://github.com/rive-app/rive-ios/blob/main/Source/Experimental/CommandServer/RiveCommandServer.mm) - Background thread command processing

**C++ Runtime (rive-runtime repo):**
- [`viewmodel_instance_number.hpp`](https://github.com/rive-app/rive-runtime/blob/main/include/rive/viewmodel/viewmodel_instance_number.hpp) - Number property definition
- [`viewmodel_instance_number.cpp`](https://github.com/rive-app/rive-runtime/blob/main/src/viewmodel/viewmodel_instance_number.cpp) - Implementation
- [`viewmodel_instance_number_runtime.hpp`](https://github.com/rive-app/rive-runtime/blob/main/include/rive/viewmodel/runtime/viewmodel_instance_number_runtime.hpp) - Runtime wrapper with `value()` getter/setter
- [`viewmodel/` directory](https://github.com/rive-app/rive-runtime/tree/main/include/rive/viewmodel) - All ViewModel types

### How Property Read Actually Works

1. **Swift calls `value(of:)`** ([ViewModelInstance.swift](https://github.com/rive-app/rive-ios/blob/main/Source/Experimental/DataBinding/ViewModelInstance.swift)):
   ```swift
   public func value(of property: NumberProperty) async throws -> Float {
       return try await dependencies.viewModelInstanceService.numberValue(
           for: viewModelInstanceHandle,
           path: property.path
       )
   }
   ```

2. **Service creates continuation** ([ViewModelInstanceService.swift](https://github.com/rive-app/rive-ios/blob/main/Source/Experimental/DataBinding/ViewModelInstanceService.swift)):
   ```swift
   func numberValue(for instance: Handle, path: String) async throws -> Float {
       return try await withCheckedThrowingContinuation { continuation in
           let requestID = commandQueue.nextRequestID
           continuations[requestID] = AnyContinuation(continuation)
           commandQueue.requestViewModelInstanceNumber(instance, path: path, requestID: requestID)
       }
   }
   ```

3. **Command queued** ([RiveCommandQueue.mm](https://github.com/rive-app/rive-ios/blob/main/Source/Experimental/CommandQueue/RiveCommandQueue.mm)):
   ```objc
   - (void)requestViewModelInstanceNumber:(uint64_t)handle path:(NSString*)path requestID:(uint64_t)requestID {
       assert([NSThread isMainThread]);  // ENFORCED!
       [self executeCommand:^{
           self->_commandQueue->requestViewModelInstanceNumber(handle, stdPath, requestID);
       }];
   }
   ```

4. **Background thread processes** ([RiveCommandServer.mm](https://github.com/rive-app/rive-ios/blob/main/Source/Experimental/CommandServer/RiveCommandServer.mm)):
   - Runs on `dispatch_queue_create("app.rive.commandServer", DISPATCH_QUEUE_SERIAL)`
   - C++ `rive::CommandServer` processes the command
   - Calls `viewmodel_instance_number_runtime->value()` to get the actual value

5. **Callback returns value** via listener → continuation resumed → Swift `await` completes

### What If We Bypass the Command Queue?

**Scenario**: Directly access C++ `ViewModelInstanceNumberRuntime::value()` from main thread.

**Problems**:

1. **Race Conditions**: The C++ objects live on the background thread managed by `CommandServer`. Reading while the background thread writes = data corruption.
   ```cpp
   // viewmodel_instance_number_runtime.hpp - NO MUTEX!
   float value() const;      // Not thread-safe
   void value(float);        // Not thread-safe
   ```

2. **No Synchronization**: The C++ layer has **zero thread safety** ([viewmodel_instance_number.cpp](https://github.com/rive-app/rive-runtime/blob/main/src/viewmodel/viewmodel_instance_number.cpp)):
   ```cpp
   void ViewModelInstanceNumber::propertyValueChanged() {
       addDirt(ComponentDirt::Bindings);  // No mutex
       onValueChanged();                   // No mutex
   }
   ```

3. **Display Link Coupling**: Values are updated during `artboard.advance()` which runs on the render loop. Reading outside this cycle may get stale or partially-updated values.

4. **Handle Invalidation**: The `viewModelInstanceHandle` is a pointer cast to `uint64_t`. If the C++ object is deallocated while you hold the handle, you get a crash.

### Could We Make It Work Without Command Queue?

**Theoretically yes, but requires significant changes:**

1. **Add Mutexes to C++ Layer**:
   - Modify `viewmodel_instance_*_runtime.hpp` to use `std::mutex`
   - Every getter/setter would need lock acquisition
   - Performance impact on rendering thread

2. **Atomic Values**:
   - Use `std::atomic<float>` for simple types
   - Doesn't work for strings, lists, nested objects

3. **Copy-on-Read**:
   - Snapshot values during `advance()` into thread-safe storage
   - Main thread reads from snapshot
   - Adds memory overhead, staleness issues

4. **Message Passing (Current Approach)**:
   - Command queue serializes access
   - Guaranteed consistency
   - Async latency tradeoff

**The command queue exists because Rive chose consistency over sync access speed.**

## Known Missing Features in Experimental API

Features available in legacy API but not yet exposed in experimental:

| Feature | Legacy API | Experimental API | Status |
|---------|-----------|------------------|--------|
| State Machine Events (RiveEvent) | `RivePlayerDelegate.onEvent()` | Not available | ❓ TBD |
| Dynamic Asset Replacement | `LoadAsset` callback mutates assets in-place | `addGlobalImageAsset` only at load time | ❌ Limited |
| SMI Inputs (number/bool/trigger) | `setNumberInput()`, etc. | Not exposed | ❌ Missing |
| Text Runs | `setTextRunValue()` | Not exposed | ❌ Missing |
| Files without State Machines | Plays timeline animations | Requires state machine | ⚠️ Limitation |
| Non-existent property validation | Returns `nil` | Returns garbage values | ⚠️ Limitation |
| Color property reading | `Color.argbValue` accessible | `Color.argbValue` internal | ⚠️ Limitation |

### Files without State Machines

The experimental API requires Rive files to have a state machine. Older animation-only files (timeline animations without state machines) will fail to load.

**Example failing file:** `https://cdn.rive.app/animations/vehicles.riv`

**Error output:**
```
ERROR : Could not create state machine with name "" because it was not found.
Could not find a View Model linked to Artboard Truck.
ERROR : State machine 0x1 not found for binding view model.
ERROR : State machine 0x1 not found for advance.
```

The view will appear empty and the errors will repeat on every frame advance.

### Non-existent Property Validation

The legacy API's property methods (`numberProperty(fromPath:)`, etc.) return `nil` if the path doesn't exist. The experimental API doesn't validate property paths at all - it returns garbage/uninitialized values instead of throwing.

**Test failure:** `non-existent properties return undefined` - expects `undefined`, gets object

**Example:**
```swift
// path 'nonexistent' doesn't exist in the ViewModel
let prop = NumberProperty(path: "nonexistent")
let value = try await instance.value(of: prop)
// Returns: -8.40482e-40 (garbage/uninitialized memory)
// Does NOT throw!
```

This means there's no way to validate whether a property path is valid. The API always succeeds but returns meaningless data for invalid paths.

### Color Property Reading

The experimental API's `Color` type has `argbValue` as an `internal` property, not `public`. We can set colors but cannot read them back.

**Implementation:** `getValue()` and `addListener()` throw errors immediately rather than returning fake/stale values.

```swift
func getValue() throws -> Promise<Double> {
    throw RuntimeError.error(withMessage: "Color getValue() not supported - rive-ios Color.argbValue is internal")
}
```

Colors set via `setValue()` work correctly in the animation, but reading color values is not possible until rive-ios exposes `Color.argbValue` publicly.

### State Machine Events

The legacy API has `RiveEvent` (`Source/Renderer/RiveEvent.h`) with player delegate callbacks. The experimental API has no equivalent. Pending confirmation from Rive team whether this is deprecated or planned for future implementation.

### Dynamic Asset Replacement

With legacy API, `LoadAsset` callback gives direct `RiveFileAsset` references. Calling `imageAsset.renderImage(newImage)` updates the running animation.

With experimental API, `worker.addGlobalImageAsset()` only affects assets resolved at artboard creation. Assets cannot be replaced on a running artboard.

## Local Development

The rive-ios source is checked out locally for reference:
```
/Users/boga/Work/Margelo/Rive/rive-ios/Source/Experimental/
```

Directory structure:
- `Artboard/` - Artboard creation and management
- `DataBinding/` - ViewModelInstance, properties, Color
- `File/` - File loading and parsing
- `Input/` - Pointer event handling
- `StateMachine/` - State machine advancement
- `View/` - RiveUIView, Rive configuration
- `Worker/` - Background thread management, global assets

## References

- [Rive Apple Documentation](https://rive.app/docs/runtimes/apple/apple)
- [Rive Data Binding](https://rive.app/docs/runtimes/data-binding)
- [Rive iOS GitHub](https://github.com/rive-app/rive-ios)
- [Rive Runtime C++ GitHub](https://github.com/rive-app/rive-runtime)
