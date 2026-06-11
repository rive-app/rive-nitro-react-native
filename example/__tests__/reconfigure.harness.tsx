import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import {
  RiveView,
  RiveFileFactory,
  Fit,
  type RiveFile,
  type RiveViewRef,
} from '@rive-app/react-native';

const BOUNCING_BALL = require('../assets/rive/bouncing_ball.riv');
const COUNTER = require('../assets/rive/counter.riv');

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type TestContext = { ref: RiveViewRef | null; error: string | null };

function SwitchableRiveView({
  file,
  context,
}: {
  file: RiveFile;
  context: TestContext;
}) {
  return (
    <View style={{ width: 200, height: 200 }}>
      <RiveView
        hybridRef={{
          f: (ref: RiveViewRef | null) => {
            context.ref = ref;
          },
        }}
        style={{ flex: 1 }}
        file={file}
        autoPlay
        fit={Fit.Contain}
        onError={(e) => {
          context.error = e.message;
        }}
      />
    </View>
  );
}

describe('RiveView reconfigure (file switch)', () => {
  it('animation still plays after switching file prop and back', async () => {
    // Fix only applies to iOS experimental — setupRiveUIView teardown churn
    if (
      Platform.OS !== 'ios' ||
      RiveFileFactory.getBackend() !== 'experimental'
    ) {
      return;
    }

    const file1 = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);
    const file2 = await RiveFileFactory.fromSource(COUNTER, undefined);
    const context: TestContext = { ref: null, error: null };

    let setFile!: (f: RiveFile) => void;
    function Wrapper() {
      const [file, _setFile] = useState<RiveFile>(file1);
      setFile = _setFile;
      return <SwitchableRiveView file={file} context={context} />;
    }

    await render(<Wrapper />);
    await waitFor(() => expect(context.ref).not.toBeNull(), { timeout: 5000 });

    // Confirm bouncing_ball is animating via its ypos ViewModel property
    const vmi1 = context.ref!.getViewModelInstance();
    expect(vmi1).not.toBeNull();
    const ypos1 = vmi1!.numberProperty('ypos');
    expect(ypos1).toBeDefined();
    const valueBefore = ypos1!.value;
    await delay(500);
    expect(ypos1!.value).not.toBe(valueBefore);

    // Switch to counter.riv — triggers setupRiveUIView reconfigure
    setFile(file2);
    await delay(600);
    expect(context.error).toBeNull();

    // Switch back to bouncing_ball — triggers setupRiveUIView again
    setFile(file1);
    await delay(600);
    expect(context.error).toBeNull();

    // Animation should still be running on the reconfigured view
    const vmi2 = context.ref!.getViewModelInstance();
    expect(vmi2).not.toBeNull();
    const ypos2 = vmi2!.numberProperty('ypos');
    expect(ypos2).toBeDefined();
    const valueAfterSwitch = ypos2!.value;
    await delay(500);
    expect(ypos2!.value).not.toBe(valueAfterSwitch);

    expect(context.error).toBeNull();
    cleanup();
  });
});
