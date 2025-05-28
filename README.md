# react-native-rive

Rive React Native 2.0

## Requirements

- React Native 0.79 or later
- Xcode 16.0 or later

## Known Issues

- Error message on Android will not have descriptive messages, this is a [known issue](https://github.com/mrousavy/nitro/issues/382) in React Native and is fixed in RN 0.80

## Installation

```sh
npm install react-native-rive react-native-nitro-modules

> `react-native-nitro-modules` is required as this library relies on [Nitro Modules](https://nitro.margelo.com/).
```

## Usage

```js
import {
  Fit,
  RiveView,
  type RiveFile,
  type RiveViewMethods,
  type RiveViewProps,
  RiveFileFactory,
} from 'react-native-rive';
import type { HybridView } from 'react-native-nitro-modules';
import { useRef } from 'react';

// Load Rive files using different methods:
// 1. From URL
const riveFile: RiveFile = await RiveFileFactory.fromURL('https://cdn.rive.app/animations/vehicles.riv');

// 2. From Resource (local file)
const riveFile: RiveFile = await RiveFileFactory.fromResource('rewards');

// 3. From ArrayBuffer
const arrayBuffer: ArrayBuffer = await downloadFileAsArrayBuffer(url);
const riveFile: RiveFile = await RiveFileFactory.fromBytes(arrayBuffer);

// Create a ref for the RiveView
const riveRef = useRef<HybridView<RiveViewProps, RiveViewMethods>>(null);

// Create a RiveView component
<RiveView
  autoBind={false}
  autoPlay={true}
  fit={Fit.Layout}
  file={riveFile}
  hybridRef={{
    f: (ref) => {
      if (ref) {
        riveRef.current = ref;
      }
    },
  }}
/>
```

## Error Handling

All Rive operations can be wrapped in try/catch blocks for error handling:

```js
try {
  const riveFile = await RiveFileFactory.fromURL(
    'https://cdn.rive.app/animations/vehicles.riv'
  );
  // Use the riveFile...
} catch (error) {
  // Handle any errors that occur during Rive operations
  console.error('Error loading Rive file:', error);
}
```

## Feature Support

The following runtime features are currently supported:

✅ Supported | ⚠️ Partial | 🚧 In Development | ❌ Not Planned

| Feature                    | Status | Description                                                      |
| -------------------------- | ------ | ---------------------------------------------------------------- |
| Artboard selection         | ✅     | Sepecify artboard to render                                      |
| State machine selection    | ✅     | Specify a state machine to play                                  |
| Animation selection        | ❌     | Animation playback not planned, use state machines               |
| View autoPlay & play/pause | ✅     | Control view playback                                            |
| Fit & Alignment            | ✅     | Fit modes supported, alignment coming soon                       |
| Layout & Responsiveness    | ⚠️     | Basic responsive layouts supported                               |
| Data Binding               | ⚠️     | Control data binding through runtime code                        |
| Asset management           | 🚧     | Out-of-band assets not yet supported                             |
| State machine inputs       | ✅     | Get/Set (nested) state machine inputs (legacy, see data binding) |
| Text Runs                  | ✅     | Update (nested) text runs (legacy, see data binding)             |
| Rive Events                | ✅     | Listen to Rive events                                            |
| Rive Audio                 | ✅     | Full Rive audio playback supported                               |
| `useRive()` hook           | ✅     | Convenient hook to access the Rive View ref after load           |
| `useRiveFile()` hook       | 🚧     | Convenient hook to load a Rive file                              |
| `RiveView` error handling  | 🚧     | Error handler for failed view operations                         |
| `source` .riv file loading | ✅     | Conveniently load .riv files from JS source                      |
| Renderer options           | ❌     | Single renderer option available (Rive)                          |

> **Note**: Several features in the table above (state machine inputs, text runs, and events) represent legacy approaches to runtime control. We recommend using data binding instead, as it provides a more maintainable way to control your Rive graphics (both at edit time and runtime).

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
