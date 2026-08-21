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
  type RiveViewRef,
} from '@rive-app/react-native';
import type { ViewModelInstance } from '@rive-app/react-native';

/**
 * Fabric deletes a component view when its subtree stops being mounted
 * (`display: 'none'`, or a react-native-screens screen frozen by
 * `enableFreeze(true)`) and recreates it from the same, unchanged ShadowNode
 * when the subtree comes back. The recreated view has to be configured from
 * those props.
 *
 * On iOS it was not: nitro tracks props with `isDirty` flags stored on the
 * shared Props object and clears them once applied, so the second view
 * instance was handed a props object whose flags the first instance had
 * already consumed. It never received its file, stayed blank forever, and the
 * ref JS holds kept pointing at the dead view. See PR #365.
 */

const QUICK_START = require('../assets/rive/quick_start.riv');

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

type TestContext = {
  ref: RiveViewRef | null;
  error: string | null;
  setHidden: ((hidden: boolean) => void) | null;
};

// The visibility state lives here so that flipping it re-renders this
// component only, leaving the RiveView's own ShadowNode untouched — the
// situation a frozen screen creates.
function HideableRive({
  context,
  file,
  instance,
}: {
  context: TestContext;
  file: RiveFile;
  instance: ViewModelInstance;
}) {
  const [hidden, setHidden] = useState(false);
  context.setHidden = setHidden;

  return (
    <View
      style={{ width: 200, height: 200, display: hidden ? 'none' : 'flex' }}
    >
      <RiveView
        hybridRef={{
          f: (ref: RiveViewRef | null) => {
            context.ref = ref;
          },
        }}
        style={{ flex: 1 }}
        file={file}
        autoPlay={true}
        dataBind={instance}
        fit={Fit.Contain}
        stateMachineName="State Machine 1"
        onError={(e) => {
          context.error = e.message;
        }}
      />
    </View>
  );
}

// A trigger only reaches its listener while a live view advances the state
// machine the instance is bound to, which is what makes this a usable answer
// to "is the view still driving this data binding?".
async function triggerReachesListener(
  instance: ViewModelInstance
): Promise<boolean> {
  const trigger = instance.triggerProperty('gameOver');
  expectDefined(trigger);
  let fired = false;
  const removeListener = trigger.addListener(() => {
    fired = true;
  });
  trigger.trigger();
  await waitFor(
    () => {
      expect(fired).toBe(true);
    },
    { timeout: 1000 }
  ).catch(() => {});
  removeListener();
  trigger.dispose();
  return fired;
}

describe('view recreated by Fabric (PR #365)', () => {
  it('keeps driving its data binding after hide/show', async () => {
    const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
    const vm = file.defaultArtboardViewModel();
    expectDefined(vm);
    const instance = vm.createDefaultInstance();
    expectDefined(instance);

    const context: TestContext = { ref: null, error: null, setHidden: null };

    await render(
      <HideableRive context={context} file={file} instance={instance} />
    );

    await waitFor(
      () => {
        expect(context.ref).not.toBeNull();
      },
      { timeout: 5000 }
    );
    await context.ref!.awaitViewReady();

    // Control: the trigger reaches its listener while the view is alive, so a
    // failure below means the view stopped working, not that the probe never did.
    expect(await triggerReachesListener(instance)).toBe(true);

    context.setHidden!(true);
    await new Promise((r) => setTimeout(r, 400));
    context.setHidden!(false);
    await new Promise((r) => setTimeout(r, 600));

    expect(context.error).toBeNull();
    expect(await triggerReachesListener(instance)).toBe(true);

    cleanup();
  });
});
