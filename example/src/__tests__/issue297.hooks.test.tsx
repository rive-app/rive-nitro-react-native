import { it, expect, render, waitFor, cleanup } from 'react-native-harness';
import { useEffect, useState } from 'react';
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
 * Issue #297 reproduced through the public `use*` hooks rather than the raw native
 * API. A live RiveView advances the state machine on the render thread while the hook
 * churns the same native property from the JS thread — value writes plus listener
 * add/remove via remounts. Always green; under a Thread Sanitizer build
 * (HARNESS_TSAN=1) TSan reports the race on the unfixed runtime and is clean on the
 * fixed one.
 */
const DATABINDING = require('../../assets/rive/databinding.riv');
const ROUNDS = 80;

type Ctx = {
  setValue: ((v: number) => void) | null;
  remount: (() => void) | null;
};

function AgeHook({ instance, ctx }: { instance: ViewModelInstance; ctx: Ctx }) {
  const { setValue } = useRiveNumber('age', instance);
  useEffect(() => {
    ctx.setValue = setValue;
  }, [ctx, setValue]);
  return null;
}

function Repro({ file, ctx }: { file: RiveFile; ctx: Ctx }) {
  const { instance } = useViewModelInstance(file);
  const [hookKey, setHookKey] = useState(0);
  useEffect(() => {
    ctx.remount = () => setHookKey((k) => k + 1);
  }, [ctx]);
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
      <AgeHook key={hookKey} instance={instance} ctx={ctx} />
    </View>
  );
}

it('issue #297: useRive* hook access races the render thread', async () => {
  const file = await RiveFileFactory.fromSource(DATABINDING, undefined);
  const ctx: Ctx = { setValue: null, remount: null };

  await render(<Repro file={file} ctx={ctx} />);
  await waitFor(() => expect(ctx.setValue).toBeTruthy());

  for (let round = 0; round < ROUNDS; round++) {
    ctx.setValue?.(round % 100);
    ctx.remount?.();
    await new Promise((r) => setTimeout(r, 0));
  }

  cleanup();
  expect(true).toBe(true);
});
