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
} from '@rive-app/react-native';

// onStop is only wired up on the new (experimental) runtime — see the
// "Animation Lifecycle" section of the README.
const isExperimental = RiveFileFactory.getBackend() === 'experimental';

// Interactive rating file: the state machine idles (settles) unless touched.
const RATING = require('../assets/rive/rating.riv');
// Continuously animating ball: never settles while playing.
const BOUNCING_BALL = require('../assets/rive/bouncing_ball.riv');

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type TestContext = {
  ref: RiveViewRef | null;
  stopCount: number;
  error: string | null;
};

function OnStopView({
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
        autoPlay={true}
        fit={Fit.Contain}
        onStop={() => {
          context.stopCount++;
        }}
        onError={(e) => {
          context.error = e.message;
        }}
      />
    </View>
  );
}

describe('RiveView onStop', () => {
  (isExperimental ? it : it.skip)(
    'fires exactly once when playback comes to rest',
    async () => {
      const file = await RiveFileFactory.fromSource(RATING, undefined);
      const context: TestContext = { ref: null, stopCount: 0, error: null };

      await render(<OnStopView file={file} context={context} />);
      await waitFor(() => expect(context.stopCount).toBeGreaterThan(0), {
        timeout: 10000,
      });

      // The render loop keeps running after the state machine settles; onStop
      // must not fire again while the content stays at rest.
      const samples: number[] = [];
      for (let i = 0; i < 4; i++) {
        await delay(1000);
        samples.push(context.stopCount);
      }
      console.log(`onStop count progression: ${samples.join(', ')}`);
      expect(context.error).toBeNull();
      expect(context.stopCount).toBe(1);
      cleanup();
    }
  );

  (isExperimental ? it : it.skip)('does not fire for pause()', async () => {
    const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);
    const context: TestContext = { ref: null, stopCount: 0, error: null };

    await render(<OnStopView file={file} context={context} />);
    await waitFor(() => expect(context.ref).not.toBeNull(), { timeout: 5000 });

    await context.ref!.pause();
    await delay(1000);
    expect(context.error).toBeNull();
    expect(context.stopCount).toBe(0);
    cleanup();
  });
});
