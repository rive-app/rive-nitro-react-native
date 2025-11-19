# react-native-rive

Rive React Native 2.0

## Requirements

- **React Native**: 0.78 or later (0.79+ recommended for better Android error messages)
- **Expo SDK**: 53 or later (for Expo users)
- **iOS**: 15.1 or later
- **Android**: SDK 24 (Android 7.0) or later
- **Xcode**: 16.4 or later
- **JDK**: 17 or later
- **Nitro Modules**: 0.25.2 or later

## Known Issues

- Error messages on Android in React Native 0.78-0.79 may not be descriptive, this is a [known issue](https://github.com/mrousavy/nitro/issues/382) in React Native and is fixed in RN 0.80

## Installation

```sh
npm install react-native-rive react-native-nitro-modules
```

> `react-native-nitro-modules` is required as this library relies on [Nitro Modules](https://nitro.margelo.com/).

## Usage

```js
import { Fit, RiveView, useRiveFile } from 'react-native-rive';

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
      fit={Fit.Layout}
      file={riveFile}
      onError={(error) => console.error('Rive error:', error.message)}
      style={{ width: '100%', height: 400 }}
    />
  );
}
```

## Native SDK Version Customization

> **⚠️ Advanced Usage:** Customizing native SDK versions is intended for advanced users only. Using non-default versions may cause build-time errors, or compatibility issues. Always review and update custom versions when upgrading react-native-rive.

By default, react-native-rive uses specific versions of the Rive native SDKs defined in the library's `package.json` (`runtimeVersions.ios` and `runtimeVersions.android`). You can customize these versions if needed.

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
import { withPodfileProperties, withGradleProperties } from '@expo/config-plugins';

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
| Layout & Responsiveness    | ✅     | Basic responsive layouts supported                               |
| Data Binding               | ⚠️     | Control data binding through runtime code                        |
| Asset management           | 🚧     | Out-of-band assets not yet supported                             |
| State machine inputs       | ✅     | Get/Set (nested) state machine inputs (legacy, see data binding) |
| Text Runs                  | ✅     | Update (nested) text runs (legacy, see data binding)             |
| Rive Events                | ✅     | Listen to Rive events                                            |
| Rive Audio                 | ✅     | Full Rive audio playback supported                               |
| `useRive()` hook           | ✅     | Convenient hook to access the Rive View ref after load           |
| `useRiveFile()` hook       | ✅     | Convenient hook to load a Rive file                              |
| `RiveView` error handling  | ✅     | Error handler for failed view operations                         |
| `source` .riv file loading | ✅     | Conveniently load .riv files from JS source                      |
| Renderer options           | ❌     | Single renderer option available (Rive)                          |

> **Note**: Several features in the table above (state machine inputs, text runs, and events) represent legacy approaches to runtime control. We recommend using data binding instead, as it provides a more maintainable way to control your Rive graphics (both at edit time and runtime).

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
