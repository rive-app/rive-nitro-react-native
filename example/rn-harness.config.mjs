import { androidPlatform, androidEmulator } from '@react-native-harness/platform-android';
import { applePlatform, appleSimulator } from '@react-native-harness/platform-apple';

// Allow CI to override device/version via environment variables
const deviceModel = process.env.DEVICE_MODEL || 'iPhone 16 Pro';
const iosVersion = process.env.IOS_VERSION || '18.6';

export default {
  entryPoint: './index.js',
  appRegistryComponentName: 'RiveExample',
  metroPort: Number(process.env.HARNESS_METRO_PORT) || 8081,
  bridgeTimeout: 90000,
  maxAppRestarts: 3,
  forwardClientLogs: true,
  runners: [
    androidPlatform({
      name: 'android',
      device: androidEmulator(process.env.ANDROID_AVD || 'Pixel_8_API_35'),
      bundleId: 'rive.example',
    }),
    applePlatform({
      name: 'ios',
      device: appleSimulator(deviceModel, iosVersion),
      bundleId: 'rive.example',
      // When the host app is built with Thread Sanitizer, route TSan reports to a
      // file and don't abort on first race so the test still completes (issue #297).
      appLaunchOptions: process.env.HARNESS_TSAN
        ? {
            environment: {
              TSAN_OPTIONS:
                'log_path=/tmp/tsan_harness halt_on_error=0 verbosity=1',
            },
          }
        : undefined,
    }),
  ],
  defaultRunner: 'ios',
};
