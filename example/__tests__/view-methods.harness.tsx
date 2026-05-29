import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { useEffect } from 'react';
import { View } from 'react-native';
import {
  RiveView,
  RiveFileFactory,
  Fit,
  type RiveFile,
  type RiveViewRef,
} from '@rive-app/react-native';

const BOUNCING_BALL = require('../assets/rive/bouncing_ball.riv');

type TestContext = {
  ref: RiveViewRef | null;
  error: string | null;
};

function SimpleRiveView({
  file,
  context,
}: {
  file: RiveFile;
  context: TestContext;
}) {
  useEffect(() => {
    return () => {
      context.ref = null;
    };
  }, [context]);

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
        autoPlay={true}
        fit={Fit.Contain}
        onError={(e) => {
          context.error = e.message;
        }}
      />
    </View>
  );
}

describe('RiveView methods', () => {
  it('pause() does not throw', async () => {
    const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);
    const context: TestContext = { ref: null, error: null };

    await render(<SimpleRiveView file={file} context={context} />);
    await waitFor(() => expect(context.ref).not.toBeNull(), { timeout: 5000 });

    await context.ref!.pause();
    expect(context.error).toBeNull();
    cleanup();
  });

  it('play() after pause() does not throw', async () => {
    const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);
    const context: TestContext = { ref: null, error: null };

    await render(<SimpleRiveView file={file} context={context} />);
    await waitFor(() => expect(context.ref).not.toBeNull(), { timeout: 5000 });

    await context.ref!.pause();
    await context.ref!.play();
    expect(context.error).toBeNull();
    cleanup();
  });

  it('reset() does not throw', async () => {
    const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);
    const context: TestContext = { ref: null, error: null };

    await render(<SimpleRiveView file={file} context={context} />);
    await waitFor(() => expect(context.ref).not.toBeNull(), { timeout: 5000 });

    await context.ref!.reset();
    expect(context.error).toBeNull();
    cleanup();
  });
});
