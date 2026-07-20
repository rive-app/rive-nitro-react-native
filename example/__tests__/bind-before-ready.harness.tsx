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
  Fit,
  type RiveFile,
  type RiveViewRef,
  type ViewModelInstance,
} from '@rive-app/react-native';

// bouncing_ball has a 'ypos' ViewModel property driven by the state machine
const BOUNCING_BALL = require('../assets/rive/bouncing_ball.riv');

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('bindViewModelInstance before view ready', () => {
  it('bind called before configure completes is applied', async () => {
    // The race only exists on the new iOS runtime — riveInstance is set async
    if (
      Platform.OS !== 'ios' ||
      RiveFileFactory.getBackend() !== 'experimental'
    ) {
      return;
    }

    const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);
    const vm = file.defaultArtboardViewModel();
    expectDefined(vm);
    const instance: ViewModelInstance = vm.createDefaultInstance()!;
    expectDefined(instance);

    let ref: RiveViewRef | null = null;
    let error: string | null = null;
    let bindCalledBeforeReady = false;

    // The hybridRef callback fires synchronously on mount, before the Swift
    // configTask async work has had a chance to run — so riveInstance is nil
    // at this point, and the bind will be silently dropped without the fix.
    function TestView({ riveFile }: { riveFile: RiveFile }) {
      return (
        <View style={{ width: 200, height: 200 }}>
          <RiveView
            hybridRef={{
              f: (r: RiveViewRef | null) => {
                ref = r;
                if (r && !bindCalledBeforeReady) {
                  bindCalledBeforeReady = true;
                  r.bindViewModelInstance(instance);
                }
              },
            }}
            style={{ flex: 1 }}
            file={riveFile}
            autoPlay
            fit={Fit.Contain}
            onError={(e) => {
              error = e.message;
            }}
          />
        </View>
      );
    }

    await render(<TestView riveFile={file} />);
    await waitFor(() => expect(ref).not.toBeNull(), { timeout: 5000 });

    expect(bindCalledBeforeReady).toBe(true);

    // Let the animation run
    await delay(1200);

    // ypos on OUR instance should be changing if the bind was applied.
    // If the bind was silently dropped, ypos stays at its initial value
    // because the state machine is driving a different (auto-bound) instance.
    const ypos = instance.numberProperty('ypos');
    expectDefined(ypos);
    const v1 = ypos.value;
    await delay(600);
    expect(ypos.value).not.toBe(v1);

    expect(error).toBeNull();
    cleanup();
  });
});
