import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { Platform, View } from 'react-native';
import {
  RiveView,
  RiveFileFactory,
  DataBindMode,
  Fit,
  type RiveViewRef,
  type ViewModelInstance,
} from '@rive-app/react-native';

// ProbeModel { seed, isReady, observedSeed }: the script caches
// context:viewModel() in init, sets isReady = 1 there, and copies seed into
// observedSeed every advance.
// Source: https://gist.github.com/luismolina13/693ab81ea35dd59136bdf8c94cb45c44
import SCRIPT_BINDING_PROBE from '../assets/rive/script_binding_probe.riv';

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

function number(instance: ViewModelInstance, name: string) {
  const prop = instance.numberProperty(name);
  expectDefined(prop);
  return prop;
}

async function waitForValues(
  instance: ViewModelInstance,
  expected: Record<string, number>,
  timeout = 5000
) {
  const names = Object.keys(expected);
  const read = async () =>
    Object.fromEntries(
      await Promise.all(
        names.map(async (name) => [
          name,
          await number(instance, name).getValueAsync(),
        ])
      )
    );
  const deadline = Date.now() + timeout;
  let actual = await read();
  while (
    names.some((name) => actual[name] !== expected[name]) &&
    Date.now() < deadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    actual = await read();
  }
  return actual;
}

describe('Scripts see the dataBind instance (issue #414)', () => {
  it('script init and advance run against the instance passed to dataBind', async () => {
    const file = await RiveFileFactory.fromSource(
      SCRIPT_BINDING_PROBE,
      undefined
    );
    const vm = await file.viewModelByNameAsync('ProbeModel');
    expectDefined(vm);
    const instance = await vm.createDefaultInstanceAsync();
    expectDefined(instance);
    await number(instance, 'seed').setValueAsync(42);

    await render(
      <View style={{ width: 160, height: 160 }}>
        <RiveView
          style={{ flex: 1 }}
          file={file}
          artboardName="Binding Probe"
          stateMachineName="Main"
          dataBind={instance}
          autoPlay={true}
          fit={Fit.Layout}
        />
      </View>
    );

    const expected = { isReady: 1, observedSeed: 42 };
    expect(await waitForValues(instance, expected)).toEqual(expected);

    cleanup();
  });

  // Auto and byName create the instance natively, so read it back from the
  // view: the script must run against the same instance JS sees.
  for (const [label, dataBind] of [
    ['DataBindMode.Auto', DataBindMode.Auto],
    ['byName', { byName: 'Default' }],
  ] as const) {
    it(`script runs against the ${label} instance returned by getViewModelInstance()`, async () => {
      // getViewModelInstance() isn't exposed for view-created instances on Android experimental
      if (
        Platform.OS === 'android' &&
        RiveFileFactory.getBackend() === 'experimental'
      ) {
        return;
      }
      const file = await RiveFileFactory.fromSource(
        SCRIPT_BINDING_PROBE,
        undefined
      );
      let viewRef: RiveViewRef | null = null;

      await render(
        <View style={{ width: 160, height: 160 }}>
          <RiveView
            hybridRef={{
              f: (ref: RiveViewRef | null) => {
                viewRef = ref;
              },
            }}
            style={{ flex: 1 }}
            file={file}
            artboardName="Binding Probe"
            stateMachineName="Main"
            dataBind={dataBind}
            autoPlay={true}
            fit={Fit.Layout}
          />
        </View>
      );

      let instance: ViewModelInstance | undefined;
      await waitFor(
        () => {
          instance = viewRef?.getViewModelInstance();
          expect(instance).toBeDefined();
        },
        { timeout: 5000 }
      );
      expectDefined(instance);

      expect(await waitForValues(instance, { isReady: 1 })).toEqual({
        isReady: 1,
      });
      await number(instance, 'seed').setValueAsync(42);
      expect(await waitForValues(instance, { observedSeed: 42 })).toEqual({
        observedSeed: 42,
      });

      cleanup();
    });
  }
});
