import { it, expect, render, waitFor, cleanup } from 'react-native-harness';
import { useEffect } from 'react';
import { View } from 'react-native';
import {
  Fit,
  RiveView,
  RiveFileFactory,
  useRiveNumber,
  useViewModelInstance,
  type RiveFile,
  type ViewModelInstance,
} from '@rive-app/react-native';

/**
 * A `useRive*` setter captured in a stale closure (async callback / timeout)
 * fires after the component unmounted. By then the property was disposed, so
 * an unguarded write throws "Cannot set hybrid property ... `NativeState` is
 * `null`" — fatal when uncaught in release. The liveRef guard in
 * useRiveProperty must turn it into a no-op.
 */
const DATABINDING = require('../../assets/rive/databinding.riv');
const WRITES = 50;

type Ctx = {
  setValue: ((v: number) => void) | null;
};

function AgeHook({ instance, ctx }: { instance: ViewModelInstance; ctx: Ctx }) {
  const { setValue } = useRiveNumber('age', instance);
  useEffect(() => {
    ctx.setValue = setValue;
  }, [ctx, setValue]);
  return null;
}

function Repro({ file, ctx }: { file: RiveFile; ctx: Ctx }) {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- stale-write regression rides the sync creation path on purpose
  const { instance } = useViewModelInstance(file);
  if (!instance) return null;
  return (
    <View style={{ width: 200, height: 200 }}>
      <RiveView
        style={{ flex: 1 }}
        file={file}
        autoPlay={true}
        dataBind={instance}
        fit={Fit.Contain}
      />
      <AgeHook instance={instance} ctx={ctx} />
    </View>
  );
}

it('stale setter write after unmount is a safe no-op', async () => {
  const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
  const ctx: Ctx = { setValue: null };

  await render(<Repro file={file} ctx={ctx} />);
  await waitFor(() => expect(ctx.setValue).toBeTruthy());

  const staleSetter = ctx.setValue!;

  // Unmount: useDisposableMemo disposes the property + VMI (deferred via
  // setTimeout(0) in __DEV__), RiveView tears down.
  cleanup();
  await new Promise((r) => setTimeout(r, 100));

  // The stale closure fires — repeatedly, with yields, to also give any
  // cross-thread teardown a chance to interleave.
  for (let i = 0; i < WRITES; i++) {
    staleSetter(i % 100);
    if (i % 25 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  await new Promise((r) => setTimeout(r, 200));

  expect(true).toBe(true);
});
