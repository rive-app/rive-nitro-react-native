# Blog Article Draft: Rewriting Rive React Native with Nitro

## Meta

- **Target blog**: https://blog.margelo.com/
- **Category**: Engineering
- **Estimated read time**: ~12 min
- **Author**: TBD (Miklós Fazekas?)
- **Style reference**: Matches Margelo blog style — code-first, conversational-but-authoritative, pain→solution→result arc, heavy code snippets, ~3500-5000 words

---

## Outline

### 1. Introduction — The Problem
- Rive is a powerful animation runtime with a rich object model: files, artboards, view models, instances, properties
- The old rive-react-native was entirely **view-oriented** — everything lived inside a single native view, controlled via string-based props and imperative commands
- Why? Because the React Native bridge architecture (NativeModules / TurboModules) only has the concept of **native modules** (singletons with methods) — not native objects (instances with state and lifecycle)
- This meant concepts like `RiveFile`, `ViewModel`, `ViewModelInstance` couldn't be first-class citizens in JS
- You couldn't load a file independently, pass it to multiple views, hold a ViewModel reference in React state, or navigate an object graph
- The API was: "give the view a URL and some string names, it does everything internally"

### 1b. Research Notes — TurboModule Limitations (potential material)
- **Still true as of RN 0.80**: TurboModule codegen only supports primitives, arrays, plain objects, promises, callbacks. No native instance types. No object-oriented interface.
- **Views are the only "objects"** — but calling a method on a view requires `findNodeHandle` (extracts a numeric tag) → `dispatchViewManagerCommand(tag, "methodName", serializedArgs)`. String-based RPC, not a method call. At least views have lifecycle management (mount/unmount).
- **Representing a native resource without views**: you must implement ID-tagging manually — generate an auto-incrementing ID in native, store the object in a map, pass the ID to JS, JS passes it back for every operation. No type safety, no lifecycle.
- **No JS finalizers**: Hermes (RN's JS engine) does not support `FinalizationRegistry` or `WeakRef`. So you can't fall back to GC-based cleanup for native resources. Either you manually manage lifetime (error-prone), or you drop to C++ HostObjects where the C++ destructor fires on GC (but GC timing is unpredictable).
- **The C++ escape hatch exists**: JSI has `HostObject` (real object references with get/set/destructor) and `NativeState` (attach C++ state to any JS object). React Native's `react/bridging/` layer even has instance method binding. But none of this is exposed through TurboModule codegen — you must write raw C++, Obj-C++, and JNI manually. Reanimated and VisionCamera proved it works, but it's hundreds of lines of bridge code per type.
- **Meta is building the plumbing but not the API**: The JSI-level infrastructure for native objects exists and is improving, but the developer-facing TurboModule spec hasn't evolved to expose it. The gap between "what JSI can do" and "what TurboModules let you express" is exactly where Nitro sits.

### 2. Why Nitro?
- Brief intro to Nitro Modules (link to nitro.margelo.com)
- The key insight: Nitro introduces **HybridObjects** — native objects (not just modules) that live on both sides of the bridge simultaneously
- TurboModules give you singletons with methods. Nitro gives you **instances with state and lifecycle** — the missing abstraction
- Everything Nitro does is technically possible with raw JSI HostObjects + JNI/Obj-C++ (even Swift is possible with Turbo/Fabric, just with a lot more boilerplate) — Nitro makes it all dramatically easier to express and maintain

### 3. Native Objects: The API That Writes Itself
- **The core win**: `RiveFile` as a `HybridObject` — a concept that simply didn't exist in the old bridge
- Show the TypeScript spec — a single interface defines the entire native API
- Show how `RiveFile` is passed directly as a prop to `RiveView` — a native handle flowing through JSI into a Fabric view
- Contrast with old approach: the view owned everything internally. Even when legacy added view-model data binding, properties were reached by string path *through a mounted view* (`useRiveNumber(riveRef, 'Energy_Bar/Lives')`) — the view was still the owner; there was no property object to hold
- The object graph: `RiveFile` → `ViewModel` → `ViewModelInstance` → `ViewModelNumberProperty` — each is a real native object you can hold, pass around, and call methods on
- This enables patterns impossible before: load a file once, pass it to multiple views; hold property references in React state; compose objects like you'd compose React components
- **Code examples**: the `.nitro.ts` spec, the Swift implementation, and the JS usage side-by-side

### 4. Deterministic Memory Management
- The old view-based approach had a simple lifecycle: view mounts → resources allocated, view unmounts → `cleanupResources()`. That worked fine because the view owned everything
- But with HybridObjects, native objects live *outside* the view — a `RiveFile` can outlive the view that created it, a `ViewModelInstance` might be shared between components
- Now memory management needs to be explicit: who owns the object? When should it be freed?
- Nitro's `dispose()` pattern gives you deterministic cleanup at the object level
- Show `HybridRiveFile.swift` dispose/deinit
- Show `useDisposableMemo` — a React hook purpose-built for this pattern (dispose when deps change, not when GC runs)
- The challenge: with standalone native objects, you can't rely on view lifecycle alone. `dispose()` gives you control
- The war story: `callDispose` and why you need to patch prototype getters before disposing (Fabric reads properties on dead NativeState)

### 5. First-Class Swift (and Kotlin)
- The old world: write your logic in Swift, then write an Obj-C++ bridge layer, then wire it to JSI manually
- Nitro: write `{ ios: 'swift'; android: 'kotlin' }` in your spec, Nitrogen generates the bridge
- Show `HybridViewModelNumberProperty.swift` — uses Swift Concurrency (`Task { @MainActor in }`, `for try await val in stream`) directly in a JSI-bound class
- No `@objc` annotations, no manual JSI glue, no Obj-C++ files
- `Promise.async {}` maps naturally to Swift's async/await
- The practical impact: your iOS team writes Swift, your Android team writes Kotlin, nobody writes bridge code

### 6. Everything Is Possible With JSI — Just Easier
- This is NOT a "TurboModules are bad" article — TurboModules solve a different problem (module singletons). For native objects, you need JSI directly
- Every pattern shown above is achievable with raw JSI HostObjects + manual C++/Obj-C++/JNI
- Libraries like Reanimated and VisionCamera proved this before Nitro existed
- The difference is in **expressiveness and maintenance cost** — especially when your object model has 15+ types
- One TypeScript spec generates the bridge for both platforms — what you'd otherwise maintain as hand-written C++ HostObjects + JNI (Android) + Obj-C++ (iOS)
- The Rive SDK is complex enough that the reduction in bridge boilerplate isn't just nice — it determines what's practical to ship

### 7. Results & Closing
- API surface comparison (lines of bridge code before/after, or similar metric)
- Developer experience improvement
- What's next for rive-react-native
- CTA: links to the repo, Nitro docs, Margelo contact

---

## Short Draft

---

# Rewriting Rive React Native with Nitro Modules

The original Rive React Native runtime was built on TurboModules, which limited what the SDK could express. Rive's object model is full of things you'd want to hold and pass around in JS — files, view models, properties — but TurboModules model *modules*, not *objects*, so it all got flattened into one view you poke with string commands. We rebuilt the SDK on [Nitro Modules](https://nitro.margelo.com), and not just because Nitro is known to be fast. Its real value here is letting us express a natural API for Rive's domain — and that API turns out to drive performance gains of its own.

Rive brings designers and developers closer together with a powerful animation runtime. But the Rive object model is rich — files contain artboards, artboards have view models, view models have instances with typed properties. Bridging all of that into React Native meant flattening it into the only abstraction the RN bridge offers: a native view controlled by props and string-based imperative commands.

The old `rive-react-native` was entirely view-oriented. You gave it a URL and some names, and everything happened internally. Want to read a property? Call a method on the view by name. Want to listen to changes? Subscribe to a generic event emitter. You couldn't hold a `RiveFile` in JS, pass a `ViewModel` between components, or navigate the object graph the way Rive's native SDKs are designed to be used.

Why? Because React Native's bridge architecture — NativeModules and TurboModules alike — only has the concept of **native modules**: singletons with methods. There's no built-in abstraction for native *objects* — instances with their own state and lifecycle that JS can hold, pass around, and call methods on.

We rewrote the Rive React Native SDK using [Nitro Modules](https://nitro.margelo.com), which introduces exactly that missing abstraction: **HybridObjects**. Here's what changed and why it matters.

## Challenges with TurboModules

TurboModules are great at what they're for: calling native functions from JS. But Rive isn't a bag of functions — it's an object graph, and that mismatch shows up in three ways.

**TurboModules are singletons, not objects.** A TurboModule is one shared instance with a flat list of methods. It [doesn't directly support objects](https://reactnative.dev/docs/appendix) — native resources with their own lifetime and instance methods — that you can hold and pass to JS. So `RiveFile` can't be a thing you hold; every call has to re-identify which file, view model, and property by string and id.

**Native resources only live inside views.** The view is RN's one abstraction with real identity and lifecycle, so the legacy SDK stuffs all native state into it and drives it with string-based RPC:

```typescript
// rive-react-native, src/Rive.tsx
UIManager.dispatchViewManagerCommand(
  findNodeHandle(riveRef.current),
  ViewManagerMethod.setNumberState,
  ['State Machine 1', 'speed', 1.5]
);
```

A resource that *isn't* a view — a `RiveFile` shared across screens — means hand-rolling an id-to-object map with no type safety and no lifecycle. And since Hermes has no `FinalizationRegistry`, there's no GC hook to free it when its JS handle goes away.

**Swift requires workarounds and Objective-C boilerplate.** Rive's iOS runtime is Swift-first, so this is the language you actually want to write against. But for TurboModules every Swift class has to be re-exported to React Native through Objective-C: `RiveReactNativeViewManager.swift` needs a companion `.m` full of `RCT_EXTERN_METHOD` macros, `@objc` annotations scattered through the Swift, and a bridging header to wire it together. It's boilerplate you maintain by hand, and it drags Objective-C back into a codebase that wraps an otherwise pure-Swift SDK.

## Native Objects as First-Class Citizens

The biggest shift is conceptual. Nitro gives you something TurboModules don't have: native objects that JS can hold as real references — not module singletons, not view tags, not string identifiers.

```typescript
// src/specs/RiveFile.nitro.ts
export interface RiveFile
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getViewModelNamesAsync(): Promise<string[]>;
  viewModelByNameAsync(name: string): Promise<ViewModel | undefined>;
  getBindableArtboard(name: string): BindableArtboard;
  getEnums(): Promise<RiveEnumDefinition[]>;
}
```

This single TypeScript interface defines the entire native API. Nitrogen (Nitro's code generator) produces the Swift protocol and Kotlin interface from it. No manual bridging. And crucially — this isn't a module singleton. Each `RiveFile` is an *instance* with its own state. You can create multiple, hold them in React state, pass them between components.

The real power shows when you pass these objects around. A `RiveFile` can be passed directly as a prop to a native view:

```typescript
// src/specs/RiveView.nitro.ts
export interface RiveViewProps extends HybridViewProps {
  file: RiveFile;              // a native handle, not a serialized ID
  dataBind?: ViewModelInstance; // another native object
  autoPlay?: boolean;
  fit?: Fit;
}
```

This is a native Rive file handle flowing through JSI directly into a Fabric view. In the old SDK, this wasn't expressible — the view owned its file internally, and you configured it by passing a `resourceName` string prop.

The object graph goes deep: `RiveFile` → `ViewModel` → `ViewModelInstance` → properties (`ViewModelNumberProperty`, `ViewModelStringProperty`, etc.). Each level is a real native object you can hold a reference to, pass between components, and call methods on. In the old world, all of this was anchored to the view — even legacy's view-model hooks bound a property by string path to a mounted view ref (`useRiveNumber(riveRef, 'Energy_Bar/Lives')`), so you couldn't get a property until a view existed, and you couldn't hold one independently of it. Now it's a typed, composable object graph you obtain straight from the file.

## Deterministic Memory Management

The old view-based approach had a straightforward lifecycle: view mounts, resources get allocated; view unmounts, `cleanupResources()` frees everything. Simple — because the view owned all native state.

But once you promote native objects to first-class JS citizens, lifecycle gets interesting. A `RiveFile` might outlive the view that loaded it. A `ViewModelInstance` might be shared between components. A `ViewModelNumberProperty` might be held in React state while the parent component re-renders. Who owns these objects? When should they be freed?

Without explicit cleanup, these objects would only be freed when the JavaScript garbage collector finalizes them — which for heavy native resources (animation workers, parsed file data) can mean unpredictable memory spikes during navigation.

Nitro's HybridObjects support explicit `dispose()`:

```swift
// ios/new/HybridRiveFile.swift
class HybridRiveFile: HybridRiveFileSpec {
  var file: File?
  var worker: Worker?

  func dispose() {
    file = nil
    worker = nil
  }

  deinit {
    dispose()
  }
}
```

Note the `deinit` — that's the safety net. A Nitro HybridObject is backed by `jsi::NativeState`, so even if you never call `dispose()`, the Swift object is released when Hermes garbage-collects its JS handle. You get deterministic cleanup when you ask for it, and a guaranteed backstop when you don't. This is exactly the lifecycle hook TurboModules couldn't offer — Hermes has no `FinalizationRegistry`, so from a plain native module there's no way to learn that a JS handle is gone, whereas Nitro operates one level below at the JSI layer where the native destructor still fires.

On the JS side, we built `useDisposableMemo` — a React hook that creates native objects synchronously during render and disposes them deterministically when deps change or the component unmounts:

```typescript
// Instead of useMemo + dispose-in-useEffect (which breaks on fast refresh):
const property = useDisposableMemo(
  () => instance?.getProperty(path),
  (p) => p?.dispose(),
  [instance, path]
);
```

This matters most for the property system. A single Rive animation can expose dozens of bindable properties, each backed by a native listener. Without deterministic cleanup, unmounting a complex animation could leave dozens of orphaned native listeners until the next GC cycle.

## First-Class Swift

Here's what a Nitro-based property listener looks like in Swift:

```swift
// ios/new/HybridViewModelNumberProperty.swift
func addListener(onChanged: @escaping (Double) -> Void) throws -> () -> Void {
  let id = UUID()
  let task = Task { @MainActor [weak self] in
    guard let self else { return }
    let current = try? await self.instance.value(of: self.prop)
    if let current, !Task.isCancelled {
      onChanged(Double(current))
    }
    for try await val in self.instance.valueStream(of: self.prop) {
      onChanged(Double(val))
    }
  }
  listenerTasks[id] = task
  return { [weak self] in
    self?.listenerTasks[id]?.cancel()
    self?.listenerTasks.removeValue(forKey: id)
  }
}
```

This is pure Swift. `Task { @MainActor in }`, `for try await val in stream`, structured concurrency with cancellation — all the modern Swift patterns, used directly in a class that's callable from JavaScript.

No `@objc` annotations. No Obj-C++ bridging files. No manual JSI registration. You write `{ ios: 'swift' }` in your TypeScript spec, and Nitrogen generates the protocol. Your Swift class conforms to it and you're done.

The same applies on Android with Kotlin — but that's a story for another section.

## Results: a better API, measured

We ran both runtimes through the same scenarios in one app. The wins aren't micro-optimizations — they fall out of the architecture.

| Scenario | Result |
|---|---|
| **Time to show N views** (jellyfish 2.9 MB × 24) | Nitro **130 ms** vs legacy **3953 ms** — ~**30×**. Nitro parses the file once and shares one `RiveFile` across views; legacy re-parses inside every view, popping them in one-by-one over ~4 s. |
| **Memory — shared file** (rewards × 9 views) | Nitro **221 MB** vs legacy **245 MB**. One parse, one set of resources vs a copy per view — and the gap widens with N. |
| **Eager release on unmount** (6× jellyfish) | Nitro snaps back to baseline in **<1 s** (native `dispose()`); legacy stays ~19 MB high and bleeds down over ~10 s. Neither leaks — Nitro just frees predictably. |
| **Data-bound property writes** | ~**1 µs/write** (Nitro, synchronous JSI) vs ~**17 µs** (legacy, async bridge) — ~**17×**, and ~1,000k vs ~57k writes/sec of throughput. |
| **File load / dispose** | Nitro `fromSource()` ~**7.8 ms**, `dispose()` ~**0.4 ms**; legacy has no file API, so mount→first-frame (~21 ms) is the closest proxy. |

Sharing one `RiveFile` is only possible because the file is a standalone object; the property-write speed is the synchronous JSI call replacing an async bridge round-trip.

### Rendering stays smooth off the JS thread

Rive rendering runs on its own native thread, independent of React. Because Nitro HybridObjects are plain JSI objects callable synchronously from any runtime — including the worklet/UI-thread runtime that `react-native-worklets` and Reanimated use — you can drive Rive properties from a worklet, not just from React state. The `Issue159` reproducer demonstrates the independence directly: it pegs the JS thread (and separately the UI thread) for 60 seconds via a worklet, and the animation keeps running.

### Bonus: Testing

The SDK is tested with [`react-native-harness`](https://www.react-native-harness.dev/) — a tool that runs tests on a real simulator or device against the actual native code, rather than mocking it. It grew out of Nitro Modules' on-device test runner, later spun into a standalone library. That lets `rive-react-native` reach significant code coverage across the real Swift implementation, not just the JS layer: 17 harness suites cover view models, property types, asset loading, triggers, navigation lifecycle, and disposal, with native code coverage wired in (`test:harness:ios:coverage`).

## Everything Is Possible With JSI — Just Easier

To be clear: TurboModules don't give you native objects, but the underlying technology — JSI — does. You can write custom `HostObject` subclasses in C++, manage their lifecycle manually, and bridge them through Obj-C++ and JNI. That's what libraries like Reanimated and VisionCamera did before Nitro existed.

The difference is **what you have to write and maintain**. The Rive SDK has a rich object model — files, artboards, view models, instances, properties of 8+ types, listeners, lists. Each of these is a native object with methods and lifecycle. With raw JSI, each one would be a C++ `HostObject` subclass with manual getter/setter dispatch, hand-written Obj-C++ bridging on iOS, and JNI glue on Android — hundreds of lines per type, duplicated across platforms.

With Nitro, each one is a TypeScript interface. The `{ ios: 'swift'; android: 'kotlin' }` annotation means one definition produces both the Swift protocol and the Kotlin interface, with all the JSI ↔ native marshalling handled by generated code. What you'd otherwise write by hand — twice, once per platform, in C++/Obj-C++/JNI — Nitrogen writes for you.

For a library with 2-3 bridged types, the overhead of manual JSI bridging is manageable. For a rich SDK like Rive with 15+ native types and deep object graphs, the reduction in boilerplate isn't just convenient — it changes what's practical to build.

---

*TODO: Add before/after metrics (lines of bridge code, API surface comparison), screenshots/diagrams, and closing CTA.*
