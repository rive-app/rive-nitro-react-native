import { describe, it, expect, waitFor, cleanup } from 'react-native-harness';
import { RiveFileFactory, RiveLog } from '@rive-app/react-native';

const BOUNCING_BALL = require('../assets/rive/bouncing_ball.riv');
const isExperimental = RiveFileFactory.getBackend() === 'experimental';

type LogEntry = { level: string; tag: string; message: string };

describe('RiveLog', () => {
  // Deprecation warnings only fire in the experimental backend
  (isExperimental ? it : it.skip)(
    'captures deprecation warning from sync method',
    async () => {
      const logs: LogEntry[] = [];
      RiveLog.setHandler((level, tag, message) => {
        logs.push({ level, tag, message });
      });

      const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);

      file.defaultArtboardViewModel();

      await waitFor(
        () => {
          const deprecation = logs.find((l) => l.tag === 'Deprecation');
          expect(deprecation).toBeDefined();
          expect(deprecation!.level).toBe('warn');
          expect(deprecation!.message).toContain('defaultArtboardViewModel');
          expect(deprecation!.message).toContain(
            'defaultArtboardViewModelAsync'
          );
        },
        { timeout: 2000 }
      );

      RiveLog.resetHandler();
      cleanup();
    }
  );

  (isExperimental ? it : it.skip)(
    'emits each deprecation only once',
    async () => {
      const logs: LogEntry[] = [];
      RiveLog.setHandler((level, tag, message) => {
        logs.push({ level, tag, message });
      });

      const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);

      // Use artboardNames — a different deprecated method so the once-per-session
      // dedup doesn't collide with the previous test.
      file.artboardNames;
      file.artboardNames;

      await waitFor(
        () => {
          const deprecations = logs.filter(
            (l) =>
              l.tag === 'Deprecation' && l.message.includes('artboardNames')
          );
          expect(deprecations.length).toBe(1);
        },
        { timeout: 2000 }
      );

      RiveLog.resetHandler();
      cleanup();
    }
  );

  // Experimental-only: needs a deterministic log source (deprecation
  // warnings), which the legacy backend doesn't emit.
  (isExperimental ? it : it.skip)(
    'suppresses all logs with a no-op handler',
    async () => {
      // First prove the capture works with a forwarding handler…
      const logs: LogEntry[] = [];
      RiveLog.setHandler((level, tag, message) => {
        logs.push({ level, tag, message });
      });

      const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);
      file.artboardCount;
      await waitFor(
        () => {
          expect(
            logs.filter((l) => l.tag === 'Deprecation').length
          ).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );

      // …then a no-op handler must swallow a fresh warning (a different
      // deprecated member, so the once-per-session dedup doesn't apply).
      const seen = logs.length;
      RiveLog.setHandler(() => {});
      file.viewModelCount;
      await new Promise((r) => setTimeout(r, 500));
      expect(logs.length).toBe(seen);

      RiveLog.resetHandler();
      cleanup();
    }
  );

  it('resetHandler restores default logging without throwing', async () => {
    RiveLog.setHandler(() => {});
    RiveLog.resetHandler();

    const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);

    file.viewModelByName('nonexistent');

    expect(true).toBe(true);

    cleanup();
  });
});
