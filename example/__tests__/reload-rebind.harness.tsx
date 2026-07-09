import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { useState } from 'react';
import { View } from 'react-native';
import {
  RiveView,
  RiveFileFactory,
  Fit,
  type RiveFile,
  type ViewModelInstance,
} from '@rive-app/react-native';

const BOUNCING_BALL = require('../assets/rive/bouncing_ball.riv');

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type TestContext = {
  setArtboardName: ((name: string) => void) | null;
};

function ReloadableView({
  file,
  instance,
  context,
}: {
  file: RiveFile;
  instance: ViewModelInstance;
  context: TestContext;
}) {
  const [artboardName, setArtboardName] = useState<string | undefined>(
    undefined
  );
  context.setArtboardName = setArtboardName;
  return (
    <View style={{ width: 200, height: 200 }}>
      <RiveView
        style={{ flex: 1 }}
        file={file}
        artboardName={artboardName}
        autoPlay
        fit={Fit.Contain}
        dataBind={instance}
      />
    </View>
  );
}

// Regression guard for review finding H3: a reload (artboardName /
// stateMachineName / file change) creates a fresh state machine, and the
// experimental Android backend used to skip applyDataBinding unless the
// dataBind prop itself changed — leaving the new state machine unbound.
// bouncing_ball's state machine continuously writes `ypos` into the bound
// instance, so a live binding is observable as a stream of listener events.
describe('RiveView reload re-bind', () => {
  it('data binding survives an artboardName reload', async () => {
    const context: TestContext = { setArtboardName: null };
    const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);
    const vm = await file.defaultArtboardViewModelAsync();
    expect(vm).toBeDefined();
    const instance = await vm!.createDefaultInstanceAsync();
    expect(instance).toBeDefined();

    const ypos = instance!.numberProperty('ypos');
    expect(ypos).toBeDefined();
    let events = 0;
    const removeListener = ypos!.addListener(() => {
      events++;
    });

    render(
      <ReloadableView file={file} instance={instance!} context={context} />
    );

    // Binding is live before the reload: the state machine streams ypos.
    await waitFor(
      () => {
        expect(events).toBeGreaterThan(2);
      },
      { timeout: 8000 }
    );

    // Reload: set an explicit artboardName (same artboard) — the dataBind
    // prop reference is unchanged, which is exactly the H3 trigger.
    const names = await file.getArtboardNamesAsync();
    expect(names.length).toBeGreaterThan(0);
    context.setArtboardName!(names[0]!);

    // Let the reload settle, then require fresh events on the new state
    // machine — on the broken build the stream stops here.
    await delay(1000);
    const eventsAfterReload = events;
    await waitFor(
      () => {
        expect(events).toBeGreaterThan(eventsAfterReload + 2);
      },
      { timeout: 8000 }
    );

    removeListener();
    cleanup();
  });
});
