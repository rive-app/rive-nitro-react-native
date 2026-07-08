import {
  describe,
  it,
  expect,
  render,
  waitFor,
  cleanup,
} from 'react-native-harness';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import {
  Fit,
  RiveFileFactory,
  RiveView,
  useRive,
  useRiveFile,
  useViewModelInstance,
  type RiveFile,
  type RiveFileInput,
  type RiveViewRef,
  type ViewModelInstance,
} from '@rive-app/react-native';

// These run against the real native runtime on purpose: the Jest unit tests
// mock the *Async APIs, but the backends genuinely diverge — the new backend
// *rejects* on a bad artboard/instance name while the legacy backend resolves
// null/undefined. These pin the hook's contract across both.
const MULTI_AB = require('../assets/rive/arbtboards-models-instances.riv');
// ViewModels exist but no artboard default (issue #189 fixture).
const NO_DEFAULT_VM = require('../assets/rive/nodefaultbouncing.riv');
// Default artboard auto-binds a default ViewModel.
const BOUNCING_BALL = require('../assets/rive/bouncing_ball.riv');

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
  const { instance, error, isLoading } = useViewModelInstance(file, {
    async: true,
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
  const { instance, error, isLoading } = useViewModelInstance(file, {
    async: true,
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
  const { instance, error, isLoading } = useViewModelInstance(file, {
    async: true,
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
  const { instance, error, isLoading } = useViewModelInstance(source, {
    async: true,
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

type FileErrorCtx = AsyncCtx & { fileErrored: boolean };

function FileErrorProbe({
  input,
  ctx,
}: {
  input: RiveFileInput | undefined;
  ctx: FileErrorCtx;
}) {
  const { riveFile, error: fileError } = useRiveFile(input);
  const { instance, error, isLoading } = useViewModelInstance(riveFile, {
    async: true,
  });
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
// The new backend throws (iOS `createArtboard`, Android `Artboard.fromFile`)
// while the legacy backend resolves undefined; the hook must map both to the
// same friendly error instead of leaking a raw native message.

describe('useViewModelInstance async: unknown artboard name', () => {
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

describe('useViewModelInstance async: onInit', () => {
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

describe('useViewModelInstance async: null vs undefined source', () => {
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
// The stable contract is the message: always "… not found", never a raw
// native error. `cause` is an optional diagnostic — present when the backend
// *rejects* (the new iOS backend throws `invalidViewModelInstance`), absent
// when the lookup resolves null (the legacy backends, and Android's
// `contains()` pre-check). Asserting a cause per-platform would pin that
// accidental divergence, so only its shape is checked when present.

describe('useViewModelInstance async: instance creation failure', () => {
  it('keeps a clean not-found message on every backend (cause optional)', async () => {
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
    // Message stays clean and stable on every platform and backend.
    expect(ctx.error.message).toContain('not found');
    expect(ctx.error.message).not.toContain('Could not create');
    const cause = (ctx.error as Error & { cause?: unknown }).cause;
    if (cause !== undefined) {
      // A rejecting backend must preserve the native diagnostic, not lose it.
      expect(String((cause as Error).message).length).toBeGreaterThan(0);
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

function RefSourceConsumer({ file, ctx }: { file: RiveFile; ctx: AsyncCtx }) {
  const { riveViewRef, setHybridRef } = useRive();
  const { instance, error, isLoading } = useViewModelInstance(riveViewRef, {
    async: true,
  });
  useEffect(() => {
    ctx.instance = instance;
    ctx.error = error;
    ctx.isLoading = isLoading;
  }, [ctx, instance, error, isLoading]);
  return (
    <View style={{ width: 200, height: 200 }}>
      <RiveView
        hybridRef={setHybridRef}
        style={{ flex: 1 }}
        file={file}
        autoPlay={true}
        fit={Fit.Contain}
      />
    </View>
  );
}

function EagerRefConsumer({ file, ctx }: { file: RiveFile; ctx: AsyncCtx }) {
  // Raw hybridRef: the ref is exposed the moment the native view attaches,
  // before awaitViewReady/auto-bind complete — the widest race window.
  const [viewRef, setViewRef] = useState<RiveViewRef | undefined>(undefined);
  const { instance, error, isLoading } = useViewModelInstance(viewRef, {
    async: true,
  });
  useEffect(() => {
    ctx.instance = instance;
    ctx.error = error;
    ctx.isLoading = isLoading;
  }, [ctx, instance, error, isLoading]);
  return (
    <View style={{ width: 200, height: 200 }}>
      <RiveView
        hybridRef={{
          f: (ref: RiveViewRef | null) => setViewRef(ref ?? undefined),
        }}
        style={{ flex: 1 }}
        file={file}
        autoPlay={true}
        fit={Fit.Contain}
      />
    </View>
  );
}

// ── RiveViewRef source: the auto-bound instance must be delivered ────
// The auto-bound ViewModelInstance resolves asynchronously a short time after
// the view ref is assigned (see autoplay.harness.tsx), so a one-shot
// getViewModelInstance() read races the bind and can settle a terminal
// { instance: null } on fast mounts.

describe('useViewModelInstance async: RiveViewRef source', () => {
  it('resolves the auto-bound instance from a useRive view ref', async () => {
    // getViewModelInstance() returns null on Android experimental — auto-bind
    // doesn't expose the VMI handle to JS yet (same skip as autoplay.harness).
    const isAndroidExperimental =
      Platform.OS === 'android' &&
      RiveFileFactory.getBackend() === 'experimental';
    if (isAndroidExperimental) return;

    const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);
    const ctx = createCtx();
    await render(<RefSourceConsumer file={file} ctx={ctx} />);
    await waitFor(() => expect(ctx.isLoading).toBe(false), { timeout: 10000 });
    expect(ctx.error).toBeNull();
    expect(ctx.instance).toBeTruthy();
    cleanup();
  });

  it('resolves the auto-bound instance from a raw hybridRef (pre-bind window)', async () => {
    const isAndroidExperimental =
      Platform.OS === 'android' &&
      RiveFileFactory.getBackend() === 'experimental';
    if (isAndroidExperimental) return;

    const file = await RiveFileFactory.fromSource(BOUNCING_BALL, undefined);
    const ctx = createCtx();
    await render(<EagerRefConsumer file={file} ctx={ctx} />);
    await waitFor(() => expect(ctx.isLoading).toBe(false), { timeout: 10000 });
    expect(ctx.error).toBeNull();
    expect(ctx.instance).toBeTruthy();
    cleanup();
  });
});

// ── A VM-less default artboard is "no ViewModel", not an error ───────
// The new backend's getDefaultViewModelInfo throws when the artboard has no
// default ViewModel, which would surface a raw native error for a perfectly
// valid file (the issue #189 fixture); the legacy backend resolves null. The
// natives normalize this to resolve-null so the hook's documented
// { instance: null, error: null } state is reachable on every backend.

describe('useViewModelInstance async: file without a default ViewModel', () => {
  it('resolves null with no error', async () => {
    const file = await RiveFileFactory.fromSource(NO_DEFAULT_VM, undefined);
    const ctx = createCtx();
    await render(<FixedSourceProbe source={file} ctx={ctx} />);
    await waitFor(() => expect(ctx.isLoading).toBe(false), { timeout: 5000 });
    expect(ctx.instance).toBeNull();
    expect(ctx.error).toBeNull();
    cleanup();
  });
});
