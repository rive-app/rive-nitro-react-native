# @rive-app/react-native

[![Build](https://github.com/rive-app/rive-nitro-react-native/actions/workflows/ci.yml/badge.svg)](https://github.com/rive-app/rive-nitro-react-native/actions)
[![NPM Version](https://img.shields.io/npm/v/@rive-app/react-native)](https://www.npmjs.com/package/@rive-app/react-native)
[![Downloads](https://img.shields.io/npm/dm/@rive-app/react-native)](https://www.npmjs.com/package/@rive-app/react-native)
[![React Native](https://img.shields.io/badge/React_Native-0.78+-61dafb)](https://reactnative.dev/)
[![iOS](https://img.shields.io/badge/iOS-15.1+-blue)](#requirements)
[![Android](https://img.shields.io/badge/Android-7.0+-green)](#requirements)
[![Rive iOS Runtime](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Frive-app%2Frive-nitro-react-native%2Fmain%2Fpackage.json&query=%24.runtimeVersions.ios&label=Rive%20iOS%20Runtime&color=informational)](https://github.com/rive-app/rive-ios/releases)
[![Rive Android Runtime](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Frive-app%2Frive-nitro-react-native%2Fmain%2Fpackage.json&query=%24.runtimeVersions.android&label=Rive%20Android%20Runtime&color=informational)](https://github.com/rive-app/rive-android/releases)

**Rive React Native 2.0**

![Rive hero image](https://cdn.rive.app/rive_logo_dark_bg.png)

## Requirements

- **React Native**: 0.78 or later (0.79+ recommended for better Android error messages)
- **Expo SDK**: 53 or later (for Expo users)
- **iOS**: 15.1 or later
- **Android**: SDK 24 (Android 7.0) or later
- **Xcode**: 16.4 or later
- **JDK**: 17 or later
- **Nitro Modules**: 0.33.2 or later

## Known Issues

- Error messages on Android in React Native 0.78-0.79 may not be descriptive, this is a [known issue](https://github.com/mrousavy/nitro/issues/382) in React Native and is fixed in RN 0.80

## Installation

```sh
npm install @rive-app/react-native react-native-nitro-modules
```

> `react-native-nitro-modules` is required as this library relies on [Nitro Modules](https://nitro.margelo.com/).

## Usage

```js
import { Fit, RiveView, useRiveFile } from '@rive-app/react-native';

function App() {
  const { riveFile } = useRiveFile({
    url: 'https://cdn.rive.app/animations/vehicles.riv',
  });

  if (!riveFile) {
    return null;
  }

  return (
    <RiveView
      autoPlay={true}
      fit={Fit.Contain}
      file={riveFile}
      onError={(error) => console.error('Rive error:', error.message)}
      style={{ width: '100%', height: 400 }}
    />
  );
}
```

## Native SDK Version Customization

> **⚠️ Advanced Usage:** Customizing native SDK versions is intended for advanced users only. Using non-default versions may cause build-time errors, or compatibility issues. Always review and update custom versions when upgrading @rive-app/react-native.

<details>

<summary>Custom Native SDK Version instructions - <b>only use if you need it!</b></summary>

By default, @rive-app/react-native uses specific versions of the Rive native SDKs defined in the library's `package.json` (`runtimeVersions.ios` and `runtimeVersions.android`). You can customize these versions if needed.

### Vanilla React Native

Add the appropriate properties to your configuration files:

**iOS** - Add to `ios/Podfile.properties.json`:

```json
{
  "RiveRuntimeIOSVersion": "6.13.0"
}
```

**Android** - Add to `android/gradle.properties`:

```properties
Rive_RiveRuntimeAndroidVersion=10.6.0
```

### Expo

Use an inline config plugin in your `app.config.ts`:

```typescript
import {
  withPodfileProperties,
  withGradleProperties,
} from '@expo/config-plugins';

export default {
  expo: {
    // ... other config
    plugins: [
      (config) => {
        config = withPodfileProperties(config, (config) => {
          config.modResults['RiveRuntimeIOSVersion'] = '6.13.0';
          return config;
        });

        config = withGradleProperties(config, (config) => {
          config.modResults.push({
            type: 'property',
            key: 'Rive_RiveRuntimeAndroidVersion',
            value: '10.6.0',
          });
          return config;
        });

        return config;
      },
    ],
  },
};
```

</details>

## Building on Windows (CMake long-path failures)

On Windows, the Android build can fail with `ninja: error: mkdir(CMakeFiles/rive.dir/...): No such file or directory` due to the Windows `MAX_PATH` (260-character) limit. This is a [known issue across React Native libraries that use CMake](https://docs.swmansion.com/react-native-reanimated/docs/guides/building-on-windows/). Set `CMAKE_VERSION` to a newer version (e.g. `3.31.6`) before building — see the Reanimated docs for full setup instructions.

## Error Handling

All Rive operations can be wrapped in try/catch blocks for error handling, for example, loading a file:

```js
try {
  const riveFile = await RiveFileFactory.fromURL(
    'https://cdn.rive.app/animations/vehicles.riv'
  );
  // Use the riveFile...
} catch (error) {
  // Handle any errors that occur during Rive file loading
  console.error('Error loading Rive file:', error);
}
```

### View-Based Errors

The `RiveView` component provides an `onError` callback prop to handle errors that occur during view configuration or runtime operations:

```js
<RiveView
  file={riveFile}
  onError={(error) => {
    // error.type contains the error type enum value
    // error.message contains a descriptive error message
    console.error(`Rive Error [${error.type}]: ${error.message}`);
  }}
/>
```

#### Error Types

The following error types can occur during view operations:

| Error Type                                     | Value | Description                                           |
| ---------------------------------------------- | ----- | ----------------------------------------------------- |
| `RiveErrorType.Unknown`                        | 0     | An unknown error occurred                             |
| `RiveErrorType.FileNotFound`                   | 1     | The specified Rive file could not be found            |
| `RiveErrorType.MalformedFile`                  | 2     | The Rive file is malformed or corrupted               |
| `RiveErrorType.IncorrectArtboardName`          | 3     | The specified artboard name does not exist            |
| `RiveErrorType.IncorrectStateMachineName`      | 4     | The specified state machine name does not exist       |
| `RiveErrorType.ViewModelInstanceNotFound`      | 6     | The specified view model instance was not found       |
| `RiveErrorType.IncorrectStateMachineInputName` | 8     | The specified state machine input name does not exist |

You can use these error types to provide specific error handling:

```js
import { RiveView, RiveErrorType } from '@rive-app/react-native';

<RiveView
  file={riveFile}
  artboardName="MainArtboard"
  onError={(error) => {
    switch (error.type) {
      case RiveErrorType.IncorrectArtboardName:
        console.error('Artboard not found:', error.message);
        // Handle missing artboard (e.g., use default artboard)
        break;
      case RiveErrorType.IncorrectStateMachineName:
        console.error('State machine not found:', error.message);
        // Handle missing state machine
        break;
      case RiveErrorType.MalformedFile:
        console.error('Corrupted file:', error.message);
        // Handle corrupted file (e.g., show error UI)
        break;
      default:
        console.error('Rive error:', error.message);
    }
  }}
  style={{ width: '100%', height: 400 }}
/>;
```

> **Note**: If no `onError` handler is provided, errors will be logged to the console by default.

## Reacting to an Animation Finishing

To run app logic when an animation completes — for example navigating away once a splash-screen animation finishes — fire a data-binding trigger from your state machine and listen for it with `useRiveTrigger`:

```tsx
import {
  RiveView,
  useRiveTrigger,
  useViewModelInstance,
} from '@rive-app/react-native';

const { instance } = useViewModelInstance(riveFile, { async: true });

useRiveTrigger('finished', instance, {
  onTrigger: () => navigation.replace('Home'),
});

<RiveView file={riveFile} dataBind={instance} autoPlay={true} />;
```

In the Rive editor: add a **Trigger** property (e.g. `finished`) to your artboard's View Model, then on the transition out of your one-shot animation state enable **Exit Time** and set it to **100%** (the value matters — an exit time of `0ms` fires immediately), and add a **Set property value** action targeting the trigger. See [this community file](https://rive.app/community/files/28526-53929-fire-a-trigger-when-timeline-finishes) for a working setup, and the "Finished Trigger" demo in the example app for the app-side wiring.

## Feature Support

This section provides a comprehensive overview of feature availability in `@rive-app/react-native`, comparing it with the [previous Rive React Native runtime](https://github.com/rive-app/rive-react-native) and outlining the development roadmap.

### Runtime Feature Comparison

**Status Legend:** ✅ Supported | ⚠️ Partial | 🚧 In Development | ❌ Not Planned

The following table compares feature availability with the [previous Rive React Native runtime](https://github.com/rive-app/rive-react-native).

| Feature                           | Status | Description                                                      |
| --------------------------------- | ------ | ---------------------------------------------------------------- |
| Artboard selection                | ✅     | Specify artboard to render                                       |
| State machine selection           | ✅     | Specify a state machine to play                                  |
| View autoPlay & play/pause        | ✅     | Control view playback                                            |
| Fit & Alignment                   | ✅     | Fit and alignment modes supported                                |
| Layout & Responsiveness           | ✅     | Basic responsive layouts supported                               |
| Data Binding                      | ✅     | Control data binding through runtime code                        |
| Asset management                  | ✅     | Load assets out of band (referenced)                             |
| State machine inputs (Deprecated) | ✅     | Get/Set (nested) state machine inputs (legacy, see data binding) |
| Text Runs (Deprecated)            | ✅     | Update (nested) text runs (legacy, see data binding)             |
| Rive Events (Deprecated)          | ✅     | Listen to Rive events                                            |
| Rive Audio                        | ✅     | Rive audio playback supported                                    |
| `useRive()` hook                  | ✅     | Convenient hook to access the Rive View ref after load           |
| `useRiveFile()` hook              | ✅     | Convenient hook to load a Rive file                              |
| `RiveView` error handling         | ✅     | Error handler for failed view operations                         |
| `source` .riv file loading        | ✅     | Conveniently load .riv files from JS source                      |
| Accessibility semantics           | ✅     | Editor-authored semantics → VoiceOver / TalkBack (new runtimes)  |
| Animation selection               | ❌     | Animation playback not planned, use state machines               |
| Renderer options                  | ❌     | Single renderer option available (Rive)                          |

> **Note**: Several features in the table above (state machine inputs, text runs, and events) represent legacy approaches to runtime control. We recommend using data binding instead, as it provides a more maintainable way to control your Rive graphics (both at edit time and runtime).

### Roadmap

**Status Legend:** ✅ Completed | 🚧 Planned |

This section tracks new features and improvements planned for this runtime that were not available in the [previous Rive React Native runtime](https://github.com/rive-app/rive-react-native).

| Feature                                                                                               | Status |
| ----------------------------------------------------------------------------------------------------- | ------ |
| [Reusable .riv File resources (preloading)](https://github.com/rive-app/rive-react-native/issues/260) | ✅     |
| [Data Binding - Images](https://github.com/rive-app/rive-nitro-react-native/issues/9)                 | ✅     |
| [Data Binding - Artboards](https://github.com/rive-app/rive-nitro-react-native/issues/10)             | ✅     |
| [Data Binding - Lists](https://github.com/rive-app/rive-nitro-react-native/issues/11)                 | ✅     |
| [Data Binding - Value props](https://github.com/rive-app/rive-nitro-react-native/pull/24)             | ✅     |
| [Suspense](https://github.com/rive-app/rive-nitro-react-native/pull/19)                               | 🚧     |

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
