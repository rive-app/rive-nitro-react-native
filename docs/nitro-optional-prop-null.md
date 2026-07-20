# Clearing optional RiveView props throws "Value is null"

## Symptom

Setting any optional `RiveView` prop from a value back to `undefined` (or
removing it from the JSX) crashes during the React commit:

```
Exception in HostFunction: RiveView.artboardName: Value is null, expected a String
    at cloneNodeWithNewProps (native)
    at completeWork (...)
```

```tsx
// artboard switches fine...
<RiveView file={file} artboardName="Artboard" />
// ...but going back to "no artboard" throws:
<RiveView file={file} artboardName={undefined} />
```

The initial render with the prop absent (or explicitly `undefined`) is fine —
only the *transition* from a value to no value throws.

## Scope

All seven optional props are affected, each failing with its own message:

| Prop                | Type    | Error                                  |
| ------------------- | ------- | -------------------------------------- |
| `artboardName`      | string  | `Value is null, expected a String`     |
| `stateMachineName`  | string  | `Value is null, expected a String`     |
| `autoPlay`          | boolean | `Value is null, expected a boolean`    |
| `alignment`         | enum    | `Value is null, expected a String`     |
| `fit`               | enum    | `Value is null, expected a number`     |
| `layoutScaleFactor` | number  | `Value is null, expected a number`     |
| `dataBind`          | variant | (variant conversion error)             |

Both Android backends (new and legacy `USE_RIVE_LEGACY=true`) are affected,
verified at runtime — and iOS is affected by construction: the throw happens in
the Nitro-generated **shared C++** prop parser
(`nitrogen/generated/shared/c++/views/HybridRiveViewComponent.cpp`), before any
Kotlin/Swift backend code runs. The Kotlin/Swift property setters themselves
accept null just fine (`override var artboardName: String?`).

Fabric **view recycling** hits the same code path: recycled views get their
props reset with `null` payloads, so this could crash without the app ever
passing `undefined` explicitly.

## Root cause

Two layers disagree about how "no value" is spelled:

1. **React Native (Fabric)**: when a prop is removed between renders, the prop
   diff sends `null` — not `undefined` — to native (see
   [`ReactNativeAttributePayload.js`](https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/ReactNative/ReactFabricPublicInstance/ReactNativeAttributePayload.js)).
2. **Nitro**: `JSIConverter<std::optional<T>>::fromJSI`
   (`react-native-nitro-modules/cpp/jsi/JSIConverter+Optional.hpp`) only maps
   `undefined` to `std::nullopt`. Everything else — including `null` — falls
   through to the inner converter (`JSIConverter<std::string>` etc.), which
   throws.

So `"Artboard"` → `undefined` becomes a `null` raw prop, and the generated
parser in `HybridRiveViewComponent.cpp` rethrows the converter error prefixed
with the prop name. The exception surfaces inside React's render
(`cloneNodeWithNewProps`), which is why an error boundary can catch it.

This is a general Nitro views bug, not specific to this library: upstream issue
[mrousavy/nitro#1184](https://github.com/mrousavy/nitro/issues/1184).

## Reproducer

`example/src/reproducers/OptionalPropClear.tsx` — the **Optional Prop Clear**
page in the example app. "Run all" sets each optional prop to a value, then
re-renders with the prop removed, and shows a per-prop PASS/FAIL matrix (an
error boundary around the `RiveView` catches the render-phase throw).

- Unfixed build: **FAIL 7/7** on both Android backends.
- Fixed build: **PASS 7/7**, and clearing correctly falls back to defaults
  (default artboard, etc.).

## Solutions

### 1. Shipped workaround: patch the generated parser (PR #326)

`scripts/nitrogen-postprocess.ts` (already run as part of `yarn nitrogen`)
rewrites `HybridRiveViewComponent.cpp` so every optional-prop parse site treats
`null` like `undefined`:

```cpp
const auto& [runtime, value] = (std::pair<jsi::Runtime*, jsi::Value>)*rawValue;
if (value.isNull()) return CachedProp<std::optional<std::string>>::fromRawValue(*runtime, jsi::Value::undefined(), sourceProps.artboardName);
return CachedProp<std::optional<std::string>>::fromRawValue(*runtime, value, sourceProps.artboardName);
```

Chosen because the generated C++ ships inside this package, so the fix reaches
consumers — unlike patching `react-native-nitro-modules`, which consumers
install themselves. Regenerating with `yarn nitrogen` re-applies it; the script
warns if nitrogen's output shape changes and the pattern no longer matches.

### 2. Proper fix: upstream in Nitro

Open PR [mrousavy/nitro#1189](https://github.com/mrousavy/nitro/pull/1189)
changes `JSIConverter<std::optional<T>>` itself: `null` maps to `std::nullopt`
unless the inner type explicitly accepts null (preserving the `null` vs
`undefined` distinction for types like `string | null`).

**Once that merges and this repo bumps `react-native-nitro-modules` past
0.35.10, remove `acceptNullForOptionalProps()` from
`scripts/nitrogen-postprocess.ts`** (the postprocess step logs whether the
patch was applied, already present, or no longer matches).

### Alternatives considered and rejected

- **JS-layer workaround** — impossible: React itself emits the `null` in the
  native prop diff when a prop is removed; no wrapper-component trick can
  prevent that short of never clearing props (e.g. sentinel values), which
  changes the public API semantics.
- **`yarn patch` on `react-native-nitro-modules`** — fixes only this repo's
  example app; consumers of the published package would still crash.
- **Declaring props as `T | null` in the `.nitro.ts` spec** — makes nitrogen
  generate null-accepting types, but leaks `null` into the public TypeScript
  API and every backend implementation for what is an internal RN diffing
  artifact.
