import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { Image, View } from 'react-native';
import {
  RiveImages,
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
const LARGE_IMAGE = require('../assets/rive/trigger-at-mount-4096.png');

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

async function mount(
  onRef: (instance: ViewModelInstance) => void,
  beforeRender?: (instance: ViewModelInstance) => void
) {
  const file: RiveFile = await RiveFileFactory.fromSource(PROBE, undefined);
  const viewModel = file.viewModelByName('Probe');
  expectDefined(viewModel);
  const instance = viewModel.createDefaultInstance();
  expectDefined(instance);
  beforeRender?.(instance);

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

  it('reaches a state machine delayed by a decode on the worker', async () => {
    const image = await RiveImages.loadFromURLAsync(
      Image.resolveAssetSource(LARGE_IMAGE).uri
    );
    // The queued decode holds back the view's state machine, which keeps the
    // window between mount and machine creation open past the ref callback.
    const { instance } = await mount(
      (vmi) => vmi.triggerProperty('fire')!.trigger(),
      (vmi) => vmi.imageProperty('art')!.set(image)
    );
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
