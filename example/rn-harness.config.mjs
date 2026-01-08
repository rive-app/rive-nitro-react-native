import { androidPlatform, androidEmulator } from '@react-native-harness/platform-android';
import { applePlatform, appleSimulator } from '@react-native-harness/platform-apple';

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
      device: appleSimulator('iPhone 16 Pro', '18.5'),
      bundleId: 'rive.example',
    }),
  ],
  defaultRunner: 'ios',
};
