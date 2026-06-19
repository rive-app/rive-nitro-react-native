import {
  androidPlatform,
  androidEmulator,
} from '@react-native-harness/platform-android';
import {
  applePlatform,
  appleSimulator,
} from '@react-native-harness/platform-apple';
import { execSync } from 'node:child_process';

// Default to the booted simulator so `yarn ios` + `yarn test:harness:ios` work without
// naming a device. Override with DEVICE_MODEL / IOS_VERSION; falls back to a fixed device
// when nothing is booted (non-macOS runners, or before a simulator is up).
function bootedSimulator() {
  const booted = [];
  try {
    const out = execSync('xcrun simctl list devices booted -j', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    for (const [runtime, devices] of Object.entries(JSON.parse(out).devices)) {
      const version = runtime.match(/iOS-(\d+)-(\d+)/);
      if (!version) continue;
      for (const device of devices || []) {
        if (device.state === 'Booted') {
          booted.push({
            name: device.name,
            version: `${version[1]}.${version[2]}`,
          });
        }
      }
    }
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    // no xcrun / no booted simulator — fall through to the default
  }
  // With several booted, `simctl install booted` and this pick can disagree, so make
  // the ambiguity loud — pin one with DEVICE_MODEL / IOS_VERSION.
  if (booted.length > 1) {
    const list = booted.map((d) => `${d.name} (${d.version})`).join(', ');
    console.warn(
      `[rn-harness] ${booted.length} booted simulators: ${list}. Using ${booted[0].name} ` +
        `(${booted[0].version}); set DEVICE_MODEL / IOS_VERSION to choose.`
    );
  }
  return booted[0] || null;
}

const booted = bootedSimulator();
const deviceModel =
  process.env.DEVICE_MODEL || (booted && booted.name) || 'iPhone 16 Pro';
const iosVersion =
  process.env.IOS_VERSION || (booted && booted.version) || '18.6';

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
      // Only read when the app is built with Thread Sanitizer (ignored otherwise):
      // write reports to a file and don't abort on the first race so the test still
      // completes (issue #297).
      appLaunchOptions: {
        environment: {
          TSAN_OPTIONS:
            'log_path=/tmp/tsan_harness halt_on_error=0 verbosity=1',
        },
      },
    }),
  ],
  defaultRunner: 'ios',
};
