/**
 * Fabric sends `null` (not `undefined`) when a prop is removed. Nitro's
 * JSIConverter<std::optional<T>> only maps `undefined` to nullopt, so clearing
 * an optional RiveView prop throws during commit — e.g.
 * "RiveView.layoutScaleFactor: Value is null, expected a number" —
 * https://github.com/mrousavy/nitro/issues/1184.
 *
 * The throw surfaces as a React error, not through onError, and an error
 * boundary above the view would swallow it — hence the boundary here, which
 * turns it into an assertable value.
 */
import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { Component, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  RiveView,
  RiveFileFactory,
  DataBindMode,
  Fit,
  type RiveFile,
  type RiveViewRef,
} from '@rive-app/react-native';

const QUICK_START = require('../assets/rive/quick_start.riv');

type Ctx = {
  ref: RiveViewRef | null;
  error: string | null;
  thrown: string | null;
};

function createCtx(): Ctx {
  return { ref: null, error: null, thrown: null };
}

class CatchCommitError extends Component<
  { ctx: Ctx; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.ctx.thrown = error.message;
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Probe({
  file,
  ctx,
  dataBind,
  layoutScaleFactor,
}: {
  file: RiveFile;
  ctx: Ctx;
  dataBind?: DataBindMode;
  layoutScaleFactor?: number;
}) {
  return (
    <View style={{ width: 200, height: 200 }}>
      <CatchCommitError ctx={ctx}>
        <RiveView
          hybridRef={{ f: (r: RiveViewRef | null) => (ctx.ref = r) }}
          style={{ flex: 1 }}
          file={file}
          fit={Fit.Contain}
          dataBind={dataBind}
          layoutScaleFactor={layoutScaleFactor}
          onError={(e) => (ctx.error = e.message)}
        />
      </CatchCommitError>
    </View>
  );
}

async function renderAndWait(element: React.ReactElement, ctx: Ctx) {
  const result = await render(element);
  await waitFor(() => expect(ctx.ref).not.toBeNull(), { timeout: 5000 });
  await ctx.ref!.awaitViewReady();
  return result;
}

describe('optional prop clear', () => {
  it('clearing dataBind back to undefined restores the default mode', async () => {
    const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
    const ctx = createCtx();

    const { rerender } = await renderAndWait(
      <Probe file={file} ctx={ctx} dataBind={DataBindMode.None} />,
      ctx
    );
    expect(ctx.ref!.getViewModelInstance()).toBeUndefined();

    // Removing the prop makes Fabric send null for it
    await rerender(<Probe file={file} ctx={ctx} dataBind={undefined} />);
    await new Promise((r) => setTimeout(r, 800));

    expect(ctx.thrown).toBeNull();
    expect(ctx.error).toBeNull();
    // Back to the default Auto mode, which binds the default instance
    expect(ctx.ref!.getViewModelInstance()).toBeDefined();

    cleanup();
  });

  it('clearing layoutScaleFactor back to undefined does not throw', async () => {
    const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
    const ctx = createCtx();

    const { rerender } = await renderAndWait(
      <Probe file={file} ctx={ctx} layoutScaleFactor={2} />,
      ctx
    );

    // optional<double> rejects the null sentinel outright
    await rerender(
      <Probe file={file} ctx={ctx} layoutScaleFactor={undefined} />
    );
    await new Promise((r) => setTimeout(r, 800));

    expect(ctx.thrown).toBeNull();
    expect(ctx.error).toBeNull();

    cleanup();
  });
});
