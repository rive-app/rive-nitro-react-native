import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import {
  RiveView,
  RiveFileFactory,
  DataBindMode,
  Fit,
  type RiveFile,
  type RiveViewRef,
  type ViewModelInstance,
} from '@rive-app/react-native';

const QUICK_START = require('../assets/rive/quick_start.riv');

type DataBind = ViewModelInstance | DataBindMode;
type TestContext = { ref: RiveViewRef | null; error: string | null };

const isIOSExperimental = () =>
  Platform.OS === 'ios' && RiveFileFactory.getBackend() === 'experimental';

function createInstance(file: RiveFile, health: number): ViewModelInstance {
  const instance = file.defaultArtboardViewModel()!.createDefaultInstance()!;
  instance.numberProperty('health')!.set(health);
  return instance;
}

function boundHealth(context: TestContext): number | undefined {
  return context.ref?.getViewModelInstance()?.numberProperty('health')?.value;
}

function TestView({
  file,
  dataBind,
  context,
  onRef,
}: {
  file: RiveFile;
  dataBind?: DataBind;
  context: TestContext;
  onRef?: (ref: RiveViewRef) => void;
}) {
  return (
    <View style={{ width: 200, height: 200 }}>
      <RiveView
        hybridRef={{
          f: (ref: RiveViewRef | null) => {
            context.ref = ref;
            if (ref) onRef?.(ref);
          },
        }}
        style={{ flex: 1 }}
        file={file}
        dataBind={dataBind}
        autoPlay
        fit={Fit.Contain}
        onError={(e) => {
          context.error = e.message;
        }}
      />
    </View>
  );
}

describe('getViewModelInstance after rebinding', () => {
  it('follows bindViewModelInstance and dataBind prop changes', async () => {
    if (!isIOSExperimental()) return;

    const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
    const a = createInstance(file, 11);
    const b = createInstance(file, 22);
    const c = createInstance(file, 33);
    const context: TestContext = { ref: null, error: null };

    let setDataBind!: (d: DataBind) => void;
    function Wrapper() {
      const [dataBind, _setDataBind] = useState<DataBind>(a);
      setDataBind = _setDataBind;
      return <TestView file={file} dataBind={dataBind} context={context} />;
    }

    await render(<Wrapper />);
    await waitFor(() => expect(context.ref).not.toBeNull(), { timeout: 5000 });
    await context.ref!.awaitViewReady();
    expect(boundHealth(context)).toBe(11);

    context.ref!.bindViewModelInstance(b);
    expect(boundHealth(context)).toBe(22);

    setDataBind(c);
    await waitFor(() => expect(boundHealth(context)).toBe(33), {
      timeout: 5000,
    });

    setDataBind(DataBindMode.Auto);
    await waitFor(
      () => {
        const health = boundHealth(context);
        expect(health).toBeDefined();
        expect([11, 22, 33]).not.toContain(health);
      },
      { timeout: 5000 }
    );

    expect(context.error).toBeNull();
    cleanup();
  });

  it('returns an instance bound before the view was ready', async () => {
    if (!isIOSExperimental()) return;

    const file = await RiveFileFactory.fromSource(QUICK_START, undefined);
    const a = createInstance(file, 11);
    const b = createInstance(file, 22);
    const context: TestContext = { ref: null, error: null };
    let bound = false;

    await render(
      <TestView
        file={file}
        dataBind={a}
        context={context}
        onRef={(ref) => {
          if (bound) return;
          bound = true;
          ref.bindViewModelInstance(b);
        }}
      />
    );
    await waitFor(() => expect(context.ref).not.toBeNull(), { timeout: 5000 });
    await context.ref!.awaitViewReady();

    expect(bound).toBe(true);
    expect(boundHealth(context)).toBe(22);
    expect(context.error).toBeNull();
    cleanup();
  });
});
