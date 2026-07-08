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
  // The harness metro resolver swaps the module this entry point resolves to
  // for the harness runtime; Expo's `.expo/.virtual-metro-entry` bundle root
  // resolves to the same expo-router/entry file, so the swap applies to the
  // app's real bundle request too.
  entryPoint: 'expo-router/entry',
  // Expo apps run `AppRegistry.runApplication('main')`.
  appRegistryComponentName: 'main',
  metroPort: Number(process.env.HARNESS_METRO_PORT) || 8081,
  // CI cold runs bundle through the harness's own Metro on first app boot;
  // allow overriding the bridge timeout there.
  bridgeTimeout: Number(process.env.HARNESS_BRIDGE_TIMEOUT) || 90000,
  maxAppRestarts: 3,
  forwardClientLogs: true,
  runners: [
    applePlatform({
      name: 'ios',
      device: appleSimulator(deviceModel, iosVersion),
      bundleId: 'com.rive.expo57-example',
    }),
  ],
  defaultRunner: 'ios',
};
