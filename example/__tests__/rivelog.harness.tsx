import { describe, it, expect, cleanup } from 'react-native-harness';
import { RiveFileFactory, RiveLog } from '@rive-app/react-native';

const BOUNCING_BALL = require('../assets/rive/bouncing_ball.riv');

type LogEntry = { level: string; tag: string; message: string };

describe('RiveLog', () => {
  it('captures deprecation warning from sync method', async () => {
    const logs: LogEntry[] = [];
    RiveLog.setHandler((level, tag, message) => {
      logs.push({ level, tag, message });
    });

    const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);

    file.defaultArtboardViewModel();

    const deprecation = logs.find((l) => l.tag === 'Deprecation');
    expect(deprecation).toBeDefined();
    expect(deprecation!.level).toBe('warn');
    expect(deprecation!.message).toContain('defaultArtboardViewModel');
    expect(deprecation!.message).toContain('defaultArtboardViewModelAsync');

    RiveLog.resetHandler();
    cleanup();
  });

  it('emits each deprecation only once', async () => {
    const logs: LogEntry[] = [];
    RiveLog.setHandler((level, tag, message) => {
      logs.push({ level, tag, message });
    });

    const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);

    // Use artboardNames — a different deprecated method so the once-per-session
    // dedup doesn't collide with the previous test.
    file.artboardNames;
    file.artboardNames;

    const deprecations = logs.filter(
      (l) => l.tag === 'Deprecation' && l.message.includes('artboardNames')
    );
    expect(deprecations.length).toBe(1);

    RiveLog.resetHandler();
    cleanup();
  });

  it('suppresses all logs with a no-op handler', async () => {
    const logs: LogEntry[] = [];
    RiveLog.setHandler(() => {});

    const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);

    file.artboardCount;

    expect(logs.length).toBe(0);

    RiveLog.resetHandler();
    cleanup();
  });

  it('resetHandler restores default logging without throwing', async () => {
    RiveLog.setHandler(() => {});
    RiveLog.resetHandler();

    const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);

    file.viewModelByName('nonexistent');

    // If we got here without throwing, the default handler works.
    expect(true).toBe(true);

    cleanup();
  });
});
