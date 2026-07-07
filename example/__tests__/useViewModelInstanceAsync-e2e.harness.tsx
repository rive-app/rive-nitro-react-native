import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import {
  RiveFileFactory,
  useRiveFile,
  useViewModelInstanceAsync,
  type RiveFile,
  type RiveFileInput,
  type ViewModelInstance,
} from '@rive-app/react-native';

// These run against the real native runtime on purpose: the Jest unit tests
// mock the *Async APIs so an unknown artboard/viewModel resolves `undefined`,
// but both platforms actually *throw* on a bad artboard name — the exact gap
// the friendly-error mapping in useViewModelInstanceAsync closes.
const MULTI_AB = require('../assets/rive/arbtboards-models-instances.riv');

function expectDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

async function loadFile() {
  return RiveFileFactory.fromSource(MULTI_AB, undefined);
}

type AsyncCtx = {
  instance: ViewModelInstance | null | undefined;
  error: Error | null;
  isLoading: boolean;
};

function createCtx(): AsyncCtx {
  return { instance: undefined, error: null, isLoading: true };
}

function ArtboardProbe({
  file,
  artboardName,
  ctx,
}: {
  file: RiveFile;
  artboardName: string;
  ctx: AsyncCtx;
}) {
  const { instance, error, isLoading } = useViewModelInstanceAsync(file, {
    artboardName,
  });
  useEffect(() => {
    ctx.instance = instance;
    ctx.error = error;
    ctx.isLoading = isLoading;
  }, [ctx, instance, error, isLoading]);
  return (
    <View>
      <Text>{String(isLoading)}</Text>
    </View>
  );
}

function ViewModelProbe({
  file,
  viewModelName,
  onInit,
  ctx,
}: {
  file: RiveFile;
  viewModelName: string;
  onInit?: (vmi: ViewModelInstance) => void;
  ctx: AsyncCtx;
}) {
  const { instance, error, isLoading } = useViewModelInstanceAsync(file, {
    viewModelName,
    onInit,
  });
  useEffect(() => {
    ctx.instance = instance;
    ctx.error = error;
    ctx.isLoading = isLoading;
  }, [ctx, instance, error, isLoading]);
  return (
    <View>
      <Text>{String(isLoading)}</Text>
    </View>
  );
}

function InstanceNameProbe({
  file,
  viewModelName,
  instanceName,
  ctx,
}: {
  file: RiveFile;
  viewModelName: string;
  instanceName: string;
  ctx: AsyncCtx;
}) {
  const { instance, error, isLoading } = useViewModelInstanceAsync(file, {
    viewModelName,
    instanceName,
  });
  useEffect(() => {
    ctx.instance = instance;
    ctx.error = error;
    ctx.isLoading = isLoading;
  }, [ctx, instance, error, isLoading]);
  return (
    <View>
      <Text>{String(isLoading)}</Text>
    </View>
  );
}

function FixedSourceProbe({
  source,
  ctx,
}: {
  source: RiveFile | null | undefined;
  ctx: AsyncCtx;
}) {
  const { instance, error, isLoading } = useViewModelInstanceAsync(source);
  useEffect(() => {
    ctx.instance = instance;
    ctx.error = error;
    ctx.isLoading = isLoading;
  }, [ctx, instance, error, isLoading]);
  return (
    <View>
      <Text>{String(isLoading)}</Text>
    </View>
  );
}

type FileErrorCtx = AsyncCtx & { fileErrored: boolean };

function FileErrorProbe({
  input,
  ctx,
}: {
  input: RiveFileInput | undefined;
  ctx: FileErrorCtx;
}) {
  const { riveFile, error: fileError } = useRiveFile(input);
  const { instance, error, isLoading } = useViewModelInstanceAsync(riveFile);
  useEffect(() => {
    ctx.fileErrored = fileError != null;
    ctx.instance = instance;
    ctx.error = error;
    ctx.isLoading = isLoading;
  }, [ctx, fileError, instance, error, isLoading]);
  return (
    <View>
      <Text>{String(isLoading)}</Text>
    </View>
  );
}

// ── #1: unknown artboard name maps to the friendly not-found error ───
// Native throws (iOS `createArtboard`, Android `Artboard.fromFile`) rather than
// resolving undefined, so without the mapping this would leak the raw native
// message through the outer catch and the "not found" branch would be dead.

describe('useViewModelInstanceAsync: unknown artboard name', () => {
  it('surfaces the friendly "not found" error instead of the raw native message', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <ArtboardProbe file={file} artboardName="doesNotExist" ctx={ctx} />
    );
    await waitFor(() => expect(ctx.isLoading).toBe(false), { timeout: 5000 });
    expect(ctx.instance).toBeNull();
    expectDefined(ctx.error);
    // Exact match: the raw native rejection message differs, so this fails if
    // the friendly-error mapping is removed and the native message leaks.
    expect(ctx.error.message).toBe(
      "Artboard 'doesNotExist' not found or has no ViewModel"
    );
    cleanup();
  });

  it('resolves an instance for a valid artboard name (control)', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <ArtboardProbe file={file} artboardName="artboard1" ctx={ctx} />
    );
    await waitFor(() => expect(ctx.instance).toBeTruthy(), { timeout: 5000 });
    expect(ctx.error).toBeNull();
    cleanup();
  });
});

// ── #3: onInit failures are surfaced, not swallowed ──────────────────
// QuickStart gated its RiveView on `instance` alone and ignored `error`, so a
// throwing onInit silently blank-screened. These lock the contract the fixed
// example now relies on: a throw becomes `error`, a clean onInit resolves.

describe('useViewModelInstanceAsync: onInit', () => {
  it('surfaces an onInit throw as error and leaves instance null', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <ViewModelProbe
        file={file}
        viewModelName="viewmodel1"
        onInit={() => {
          throw new Error('init boom');
        }}
        ctx={ctx}
      />
    );
    await waitFor(() => expect(ctx.error).not.toBeNull(), { timeout: 5000 });
    expect(ctx.error!.message).toBe('init boom');
    expect(ctx.instance).toBeNull();
    cleanup();
  });

  it('runs a clean onInit against the real instance and resolves (control)', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    let seenId: string | undefined;
    await render(
      <ViewModelProbe
        file={file}
        viewModelName="viewmodel1"
        onInit={(vmi) => {
          seenId = vmi.stringProperty('_id')?.value;
        }}
        ctx={ctx}
      />
    );
    await waitFor(() => expect(ctx.instance).toBeTruthy(), { timeout: 5000 });
    expect(ctx.error).toBeNull();
    expect(seenId).toBe('vm1.vmi.id');
    cleanup();
  });
});

// ── #2: a null (errored/absent) source must not spin forever ─────────
// useRiveFile returns `undefined` while loading but `null` once it errors. The
// hook must keep `undefined` in the loading state (file still resolving) yet
// terminate on `null`, otherwise a consumer keying a spinner off `isLoading`
// hangs forever with no signal.

describe('useViewModelInstanceAsync: null vs undefined source', () => {
  it('stays loading while the source is undefined (file still resolving)', async () => {
    const ctx = createCtx();
    await render(<FixedSourceProbe source={undefined} ctx={ctx} />);
    // Give any async resolution a chance to (incorrectly) settle.
    await new Promise((r) => setTimeout(r, 500));
    expect(ctx.isLoading).toBe(true);
    expect(ctx.instance).toBeUndefined();
    expect(ctx.error).toBeNull();
    cleanup();
  });

  it('terminates (not loading) when the source is null', async () => {
    const ctx = createCtx();
    await render(<FixedSourceProbe source={null} ctx={ctx} />);
    await waitFor(() => expect(ctx.isLoading).toBe(false), { timeout: 3000 });
    expect(ctx.instance).toBeNull();
    expect(ctx.error).toBeNull();
    cleanup();
  });

  it('terminates when useRiveFile fails to load the file', async () => {
    const ctx: FileErrorCtx = { ...createCtx(), fileErrored: false };
    // `undefined` input makes useRiveFile resolve to { riveFile: null, error },
    // the same terminal shape a real load failure produces.
    await render(<FileErrorProbe input={undefined} ctx={ctx} />);
    await waitFor(() => expect(ctx.fileErrored).toBe(true), { timeout: 3000 });
    await waitFor(() => expect(ctx.isLoading).toBe(false), { timeout: 3000 });
    expect(ctx.instance).toBeNull();
    cleanup();
  });
});

// ── Instance creation failure keeps a clean message + native cause ───
// When createInstanceByNameAsync *rejects*, the message stays a stable
// "… not found" but the native diagnostic is attached as `error.cause` so it
// isn't lost. The platforms diverge on a bad name: iOS throws
// `invalidViewModelInstance` (no pre-check) → a cause is present; Android's
// `contains()` guard resolves null → no cause. This pins that real contract.

describe('useViewModelInstanceAsync: instance creation failure', () => {
  it('keeps a clean not-found message and attaches the native cause on iOS', async () => {
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <InstanceNameProbe
        file={file}
        viewModelName="viewmodel1"
        instanceName="   "
        ctx={ctx}
      />
    );
    await waitFor(() => expect(ctx.isLoading).toBe(false), { timeout: 5000 });
    expect(ctx.instance).toBeNull();
    expectDefined(ctx.error);
    // Message stays clean and stable on every platform.
    expect(ctx.error.message).toContain('not found');
    const cause = (ctx.error as Error & { cause?: unknown }).cause;
    if (Platform.OS === 'ios') {
      // iOS rejects with invalidViewModelInstance — preserved as `cause`,
      // not leaked into the message.
      expectDefined(cause);
      expect(String((cause as Error).message)).toContain('Could not create');
    } else {
      // Android resolves null on a missing name — a plain not-found, no cause.
      expect(cause).toBeUndefined();
    }
    cleanup();
  });

  it('reports not-found when the instance genuinely resolves to null', async () => {
    // A ViewModel with no such named instance that resolves (not throws) must
    // still read as "not found" — the branch reserved for the null case.
    const file = await loadFile();
    const ctx = createCtx();
    await render(
      <InstanceNameProbe
        file={file}
        viewModelName="viewmodel1"
        instanceName="definitelyMissingInstance"
        ctx={ctx}
      />
    );
    await waitFor(() => expect(ctx.isLoading).toBe(false), { timeout: 5000 });
    expect(ctx.instance).toBeNull();
    expectDefined(ctx.error);
    cleanup();
  });
});
