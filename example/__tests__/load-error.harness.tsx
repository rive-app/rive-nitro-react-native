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

const QUICK_START = require('../assets/rive/quick_start.riv');
const isExperimental = RiveFileFactory.getBackend() === 'experimental';

type TestContext = { ref: RiveViewRef | null; errors: string[] };

function BadArtboardView({
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
        artboardName="DoesNotExist"
        autoPlay
        fit={Fit.Contain}
        onError={(e) => {
          context.errors.push(e.message);
        }}
      />
    </View>
  );
}

// Regression guard for review finding H2: a configure failure (bad
// artboardName) used to be logged natively only — onError never fired and
// awaitViewReady() hung forever, leaking the pending promise.
describe('RiveView load error path', () => {
  it('bad artboardName reaches onError', async () => {
    const context: TestContext = { ref: null, errors: [] };
    const file = await RiveFileFactory.fromSource(QUICK_START, undefined);

    render(<BadArtboardView file={file} context={context} />);

    await waitFor(
      () => {
        expect(context.errors.length).toBeGreaterThan(0);
      },
      { timeout: 5000 }
    );

    cleanup();
  });

  // Experimental contract: awaitViewReady() settles (false) instead of
  // hanging — on iOS when configure fails, on Android at the latest when the
  // view is disposed. Legacy resolves it unconditionally at configure time,
  // so the interesting guarantee is experimental-only.
  (isExperimental ? it : it.skip)(
    'awaitViewReady settles instead of hanging on a bad artboardName',
    async () => {
      const context: TestContext = { ref: null, errors: [] };
      const file = await RiveFileFactory.fromSource(QUICK_START, undefined);

      render(<BadArtboardView file={file} context={context} />);

      await waitFor(
        () => {
          expect(context.ref).not.toBeNull();
        },
        { timeout: 5000 }
      );

      // Start awaiting before unmount; the promise must settle, not hang.
      const settled = context.ref!.awaitViewReady().then(
        (ready) => ({ outcome: 'resolved' as const, ready }),
        () => ({ outcome: 'rejected' as const, ready: false })
      );

      // Give the configure failure a moment, then unmount (dispose is the
      // backstop that settles any still-pending waiters).
      await new Promise((r) => setTimeout(r, 500));
      cleanup();

      const result = await Promise.race([
        settled,
        new Promise<{ outcome: 'timeout'; ready: boolean }>((r) =>
          setTimeout(() => r({ outcome: 'timeout', ready: false }), 6000)
        ),
      ]);

      // The H2 regression was a promise that never settles. Whether it
      // resolves true or false is timing/platform-dependent (Android can
      // draw one default-artboard frame before the bad artboardName prop
      // lands), so only the settlement is asserted.
      expect(result.outcome).not.toBe('timeout');
    }
  );
});
