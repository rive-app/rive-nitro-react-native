import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { Activity, useEffect, useState } from 'react';
import {
  RiveView,
  RiveFileFactory,
  useRive,
  type RiveFile,
  type RiveViewRef,
} from '@rive-app/react-native';

/**
 * On iOS, Fabric creates a new native view when an <Activity> reveals a
 * RiveView, and RiveView disposes the one it replaced. Effects depending on
 * useRive's riveViewRef must never see that disposed view (#473).
 */

const QUICK_START = require('../assets/rive/quick_start.riv');

type Seen = { view: RiveViewRef; playable: boolean };

type TestContext = {
  node: RiveViewRef | null;
  seen: Seen[];
  setHidden: ((hidden: boolean) => void) | null;
};

function Subject({ context, file }: { context: TestContext; file: RiveFile }) {
  const { riveViewRef, setHybridRef } = useRive();
  const [arrivals, setArrivals] = useState(0);
  const [hybridRef] = useState(() => ({
    f: (node: RiveViewRef | null) => {
      // RiveView passes a new hybridRef each render, so Nitro calls this
      // again with the same node.
      if (node === context.node) return;
      context.node = node;
      setHybridRef.f(node);
      setArrivals((n) => n + 1);
    },
  }));
  // Re-runs on unrelated state, here the arrival of a new view, and sees the
  // riveViewRef of that render.
  useEffect(() => {
    if (!riveViewRef) return;
    // callDispose replaces a disposed view's methods with undefined.
    context.seen.push({
      view: riveViewRef,
      playable: typeof riveViewRef.play === 'function',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, arrivals]);
  return (
    <RiveView
      style={{ width: 200, height: 200 }}
      file={file}
      hybridRef={hybridRef}
      autoPlay={false}
    />
  );
}

function Host({ context, file }: { context: TestContext; file: RiveFile }) {
  const [hidden, setHidden] = useState(false);
  context.setHidden = setHidden;
  return (
    <Activity mode={hidden ? 'hidden' : 'visible'}>
      <Subject context={context} file={file} />
    </Activity>
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('useRive across an <Activity> reveal (#473)', () => {
  it('never hands effects a disposed view', async () => {
    // Undefined before React 19.2, e.g. in the bare example app.
    if (!Activity) return;
    const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
    const context: TestContext = {
      node: null,
      seen: [],
      setHidden: null,
    };

    await render(<Host context={context} file={file} />);
    await waitFor(() => expect(context.node).not.toBeNull(), {
      timeout: 5000,
    });
    await context.node!.awaitViewReady();

    for (let i = 0; i < 3; i++) {
      context.setHidden!(true);
      await sleep(300);
      context.setHidden!(false);
      await sleep(600);
    }

    expect(context.seen.filter((s) => !s.playable).length).toBe(0);

    cleanup();
  });
});
