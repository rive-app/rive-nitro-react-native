# Missing Experimental iOS API Methods

This document tracks RiveRuntime experimental API methods that are needed for full feature parity with the legacy API.

## Context

The experimental iOS API (`@_spi(RiveExperimental) import RiveRuntime`) is fully async, but some Nitro specs require sync properties. We use `blockingAsync` helper to bridge async→sync when the API exists, but some methods are missing entirely.

## Missing API Methods

### ViewModelInstance

| Property/Method | Current Behavior | Needed API |
|-----------------|------------------|------------|
| `instanceName: String` | Returns `""` | `ViewModelInstance.name` or async equivalent to get instance name |

### ViewModel

| Property/Method | Current Behavior | Needed API |
|-----------------|------------------|------------|
| `propertyCount: Double` | Returns `0` | Method to get count of properties in a ViewModel |
| `instanceCount: Double` | Returns `0` | Method to get count of instances in a ViewModel |

### ViewModelListProperty

| Property/Method | Current Behavior | Needed API |
|-----------------|------------------|------------|
| `addListener(onChanged:)` | Returns empty cleanup function | Stream or callback for list change notifications |

### ViewModelColorProperty

| Property/Method | Current Behavior | Needed API |
|-----------------|------------------|------------|
| `getValue()` | Returns cached value only | `Color.argbValue` or `Color.red/green/blue/alpha` need to be public (currently `internal`) |

See: https://github.com/rive-app/rive-ios/blob/main/Source/Experimental/DataBinding/Color.swift

## Workarounds

For sync properties where async API exists, we use `blockingAsync`:

```swift
var length: Double {
  do {
    return try blockingAsync {
      try await Double(self.vmiInstance.size(of: self.prop))
    }
  } catch {
    return 0
  }
}
```

This works because Nitro calls Swift on the JS thread (not main thread), so blocking with a semaphore while MainActor work runs doesn't deadlock.

## Status

Last updated: 2025-01-29
