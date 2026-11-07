import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { View } from 'react-native';
import {
  RiveView,
  RiveFileFactory,
  Fit,
  type RiveFile,
  type RiveViewRef,
  type ViewModelInstance,
} from '@rive-app/react-native';

// `fire` moves the state machine into a state that stays, and that state's x
// flows back to `firedX`: -400 until fired, 0 after.
const PROBE = require('../assets/rive/issue445_probe.riv');

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

async function mount(onRef: (instance: ViewModelInstance) => void) {
  const file: RiveFile = await RiveFileFactory.fromSource(PROBE, undefined);
  const viewModel = file.viewModelByName('Probe');
  expectDefined(viewModel);
  const instance = viewModel.createDefaultInstance();
  expectDefined(instance);

  let ref: RiveViewRef | null = null;
  await render(
    <View style={{ width: 200, height: 200 }}>
      <RiveView
        hybridRef={{
          f: (r: RiveViewRef | null) => {
            if (r && !ref) {
              ref = r;
              onRef(instance);
            }
          },
        }}
        style={{ flex: 1 }}
        file={file}
        dataBind={instance}
        autoPlay
        fit={Fit.Contain}
      />
    </View>
  );
  await waitFor(() => expect(ref).not.toBeNull(), { timeout: 5000 });
  return { instance, view: ref as unknown as RiveViewRef };
}

async function expectFired(instance: ViewModelInstance) {
  const firedX = instance.numberProperty('firedX');
  expectDefined(firedX);
  await waitFor(async () => expect(await firedX.getValueAsync()).toBe(0), {
    timeout: 3000,
  });
}

describe('trigger fired around mount', () => {
  it('reaches the state machine when fired from the view ref', async () => {
    const { instance } = await mount((vmi) => {
      vmi.triggerProperty('fire')!.trigger();
    });
    await expectFired(instance);
    cleanup();
  });

  it('reaches the state machine when fired at view ready', async () => {
    const { instance, view } = await mount(() => {});
    await view.awaitViewReady();
    instance.triggerProperty('fire')!.trigger();
    await expectFired(instance);
    cleanup();
  });
});
