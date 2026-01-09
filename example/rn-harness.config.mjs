import { androidPlatform, androidEmulator } from '@react-native-harness/platform-android';
import { applePlatform, appleSimulator } from '@react-native-harness/platform-apple';

// Allow CI to override device/version via environment variables
const deviceModel = process.env.DEVICE_MODEL || 'iPhone 16 Pro';
const iosVersion = process.env.IOS_VERSION || '18.6';

export default {
  entryPoint: './index.js',
  appRegistryComponentName: 'RiveExample',
  runners: [
    androidPlatform({
      name: 'android',
      device: androidEmulator('Pixel_8_API_35'),
      bundleId: 'rive.example',
    }),
    applePlatform({
      name: 'ios',
      device: appleSimulator(deviceModel, iosVersion),
      bundleId: 'rive.example',
    }),
  ],
  defaultRunner: 'ios',
};
