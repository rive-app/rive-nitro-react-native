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
const isExperimental = RiveFileFactory.getBackend() === 'experimental';

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

// The headline behavioral break of the experimental backend: the deprecated
// SMI-input / text-run / event methods throw instead of being implemented.
// Guards the documented contract (specs say "Throws on the experimental
// backend") — if an implementation lands, update the docs and these tests.
describe('deprecated RiveView methods throw on the experimental backend', () => {
  const mountView = async () => {
    const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);
    const context: TestContext = { ref: null, error: null };
    await render(<SimpleRiveView file={file} context={context} />);
    await waitFor(() => expect(context.ref).not.toBeNull(), {
      timeout: 5000,
    });
    return context;
  };

  (isExperimental ? it : it.skip)(
    'state machine input methods throw',
    async () => {
      const context = await mountView();
      expect(() =>
        context.ref!.setNumberInputValue('x', 1, undefined)
      ).toThrow();
      expect(() => context.ref!.getNumberInputValue('x', undefined)).toThrow();
      expect(() =>
        context.ref!.setBooleanInputValue('x', true, undefined)
      ).toThrow();
      expect(() => context.ref!.getBooleanInputValue('x', undefined)).toThrow();
      expect(() => context.ref!.triggerInput('x', undefined)).toThrow();
      cleanup();
    }
  );

  (isExperimental ? it : it.skip)('text run methods throw', async () => {
    const context = await mountView();
    expect(() =>
      context.ref!.setTextRunValue('run', 'text', undefined)
    ).toThrow();
    expect(() => context.ref!.getTextRunValue('run', undefined)).toThrow();
    cleanup();
  });

  (isExperimental ? it : it.skip)('event listener methods throw', async () => {
    const context = await mountView();
    expect(() => context.ref!.onEventListener(() => {})).toThrow();
    expect(() => context.ref!.removeEventListeners()).toThrow();
    cleanup();
  });
});
