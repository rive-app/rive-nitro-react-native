import { describe, it, expect, render, cleanup } from 'react-native-harness';
import { View } from 'react-native';
import {
  RiveView,
  RiveFileFactory,
  Fit,
  type ViewModelInstance,
} from '@rive-app/react-native';

// Probe { input, output }: input 1 moves Idle -> Hit and 0 moves it back; their
// animations key a shape's x that is bound back into output (10 and 77). Both
// states rest on a held frame, so the state machine settles right after each.
// Source: example/assets/rive-src/settle_probe
const SETTLE_PROBE = require('../assets/rive/settle_probe.riv');

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

async function waitForNumber(
  instance: ViewModelInstance,
  name: string,
  expected: number,
  timeout = 5000
) {
  const prop = instance.numberProperty(name);
  expectDefined(prop);
  const deadline = Date.now() + timeout;
  let actual = await prop.getValueAsync();
  while (actual !== expected && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    actual = await prop.getValueAsync();
  }
  return actual;
}

describe('Settled state machine', () => {
  it('applies a view model property set from JS after it has settled', async () => {
    // Legacy Android also drops writes made after the state machine settles.
    if (RiveFileFactory.getBackend() !== 'experimental') {
      return;
    }
    const file = await RiveFileFactory.fromSource(SETTLE_PROBE, undefined);
    const vm = await file.viewModelByNameAsync('Probe');
    expectDefined(vm);
    const instance = await vm.createDefaultInstanceAsync();
    expectDefined(instance);

    await render(
      <View style={{ width: 160, height: 160 }}>
        <RiveView
          style={{ flex: 1 }}
          file={file}
          dataBind={instance}
          autoPlay={true}
          fit={Fit.Contain}
        />
      </View>
    );

    expect(await waitForNumber(instance, 'output', 10)).toBe(10);
    // Give the state machine time to report that it settled.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const input = instance.numberProperty('input');
    expectDefined(input);
    await input.setValueAsync(1);

    expect(await waitForNumber(instance, 'output', 77)).toBe(77);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await input.setValueAsync(0);

    expect(await waitForNumber(instance, 'output', 10)).toBe(10);

    cleanup();
  });
});
