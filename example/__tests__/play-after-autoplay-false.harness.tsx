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
  DataBindMode,
  type RiveFile,
  type RiveViewRef,
} from '@rive-app/react-native';

// rating.riv: single artboard with state machine "State Machine 1" and a
// number input "rating".
const RATING = require('../assets/rive/rating.riv');

// Issue #332 follow-up: play() on a view mounted with autoPlay={false} must
// start the *configured* state machine and leave its inputs writable. On
// Android it used to fall through to rive-android's no-arg play() (first raw
// animation + first state machine) without tracking the active machine, so
// input writes threw "View not configured".

type TestContext = {
  ref: RiveViewRef | null;
  error: string | null;
};

function RatingView({
  file,
  autoPlay,
  context,
}: {
  file: RiveFile;
  autoPlay: boolean;
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
        autoPlay={autoPlay}
        stateMachineName="State Machine 1"
        dataBind={DataBindMode.None}
        fit={Fit.Contain}
        onError={(e) => {
          context.error = e.message;
        }}
      />
    </View>
  );
}

async function mountRatingView(autoPlay: boolean): Promise<TestContext> {
  const file = await RiveFileFactory.fromSource(RATING, undefined);
  const context: TestContext = { ref: null, error: null };

  await render(
    <RatingView file={file} autoPlay={autoPlay} context={context} />
  );

  await waitFor(
    () => {
      expect(context.ref).not.toBeNull();
    },
    { timeout: 5000 }
  );
  await context.ref!.awaitViewReady();
  return context;
}

// Polls until the input accepts a write, i.e. the state machine is instanced
// and tracked.
async function waitForWritableInput(context: TestContext): Promise<void> {
  await waitFor(
    () => {
      context.ref!.setNumberInputValue('rating', 3);
      expect(context.ref!.getNumberInputValue('rating')).toBe(3);
    },
    { timeout: 4000 }
  );
}

// The regression under test (#343) is in the legacy backend, and the probe
// relies on SMI inputs — a legacy-only API that throws on the experimental
// backends (both platforms).
function skipOnExperimental(): boolean {
  if (RiveFileFactory.getBackend() === 'experimental') {
    console.warn('SKIP: experimental backend — SMI inputs are not supported');
    return true;
  }
  return false;
}

describe('play() after autoPlay={false} (issue #332 follow-up)', () => {
  it('control: autoPlay={true} exposes a writable state machine input', async () => {
    if (skipOnExperimental()) return;
    const context = await mountRatingView(true);

    await waitForWritableInput(context);

    expect(context.error).toBeNull();
    cleanup();
  });

  it('play() starts the configured state machine with writable inputs', async () => {
    if (skipOnExperimental()) return;
    const context = await mountRatingView(false);

    await context.ref!.play();

    await waitForWritableInput(context);

    expect(context.error).toBeNull();
    cleanup();
  });
});
